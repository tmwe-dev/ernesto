// ============================================================================
// ERNESTO Sync Engine — Bidirectional Local ↔ Supabase Sync
// Strategy: local-first writes, background push/pull with conflict resolution
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js';
import {
  ErnestoLocalDB,
  getLocalDB,
  LocalMemoryItem,
  LocalKBRule,
  LocalDocument,
  LocalChatMessage,
  LocalSyncMeta,
} from './local-db';

interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

type SyncStatus = 'idle' | 'syncing' | 'error';

// ── Main Sync Engine Class ──

export class SyncEngine {
  private db: ErnestoLocalDB;
  private supabase: SupabaseClient;
  private userId: string;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private _status: SyncStatus = 'idle';
  private _lastError: string | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
    this.db = getLocalDB(userId);
  }

  get status(): SyncStatus {
    return this._status;
  }

  get lastError(): string | null {
    return this._lastError;
  }

  // ── Lifecycle ──

  start(intervalMs = 30000): void {
    this.syncInterval = setInterval(() => this.syncAll(), intervalMs);
    // Initial sync on start
    this.syncAll().catch(console.error);
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SyncStatus, error?: string) {
    this._status = status;
    this._lastError = error || null;
    this.listeners.forEach(fn => fn(status));
  }

  // ── Full Sync ──

  async syncAll(): Promise<SyncResult> {
    if (this._status === 'syncing') return { pushed: 0, pulled: 0, conflicts: 0, errors: ['Already syncing'] };

    this.setStatus('syncing');
    const result: SyncResult = { pushed: 0, pulled: 0, conflicts: 0, errors: [] };

    try {
      // Push local changes first (local-first priority)
      const pushResult = await this.pushAll();
      result.pushed = pushResult.pushed;
      result.errors.push(...pushResult.errors);

      // Pull remote changes
      const pullResult = await this.pullAll();
      result.pulled = pullResult.pulled;
      result.conflicts = pullResult.conflicts;
      result.errors.push(...pullResult.errors);

      this.setStatus('idle');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      result.errors.push(msg);
      this.setStatus('error', msg);
    }

    return result;
  }

  // ── Push (Local → Supabase) ──

  private async pushAll(): Promise<{ pushed: number; errors: string[] }> {
    let pushed = 0;
    const errors: string[] = [];

    // Push memory items
    const dirtyMemory = await this.db.memoryItems.filter(r => r._dirty).toArray();
    for (const item of dirtyMemory) {
      try {
        if (item._deleted) {
          await this.supabase.from('ernesto_memory_items').delete().eq('id', item.id);
          await this.db.memoryItems.delete(item.id);
        } else {
          const { _dirty, _deleted, ...data } = item;
          const serverData = this.memoryToServer(data);
          await this.supabase.from('ernesto_memory_items').upsert(serverData, { onConflict: 'id' });
          await this.db.memoryItems.update(item.id, { _dirty: false });
        }
        pushed++;
      } catch (err) {
        errors.push(`memory_item ${item.id}: ${err instanceof Error ? err.message : 'push failed'}`);
      }
    }

    // Push KB rules
    const dirtyRules = await this.db.kbRules.filter(r => r._dirty).toArray();
    for (const rule of dirtyRules) {
      try {
        if (rule._deleted) {
          await this.supabase.from('ernesto_knowledge_rules').delete().eq('id', rule.id);
          await this.db.kbRules.delete(rule.id);
        } else {
          const { _dirty, _deleted, ...data } = rule;
          await this.supabase.from('ernesto_knowledge_rules').upsert(data, { onConflict: 'id' });
          await this.db.kbRules.update(rule.id, { _dirty: false });
        }
        pushed++;
      } catch (err) {
        errors.push(`kb_rule ${rule.id}: ${err instanceof Error ? err.message : 'push failed'}`);
      }
    }

    // Push documents
    const dirtyDocs = await this.db.documents.filter(r => r._dirty).toArray();
    for (const doc of dirtyDocs) {
      try {
        if (doc._deleted) {
          await this.supabase.from('ernesto_documents').delete().eq('id', doc.id);
          await this.db.documents.delete(doc.id);
        } else {
          const { _dirty, _deleted, ...data } = doc;
          await this.supabase.from('ernesto_documents').upsert(data, { onConflict: 'id' });
          await this.db.documents.update(doc.id, { _dirty: false });
        }
        pushed++;
      } catch (err) {
        errors.push(`document ${doc.id}: ${err instanceof Error ? err.message : 'push failed'}`);
      }
    }

    return { pushed, errors };
  }

  // ── Pull (Supabase → Local) ──

  private async pullAll(): Promise<{ pulled: number; conflicts: number; errors: string[] }> {
    let pulled = 0;
    let conflicts = 0;
    const errors: string[] = [];

    // Pull memory items
    try {
      const meta = await this.getSyncMeta('memoryItems');
      const { data: serverItems, error } = await this.supabase
        .from('ernesto_memory_items')
        .select('*')
        .eq('user_id', this.userId)
        .gt('updated_at', meta.lastSyncAt)
        .order('updated_at', { ascending: true });

      if (error) throw error;
      if (serverItems) {
        for (const serverItem of serverItems) {
          const localItem = await this.db.memoryItems.get(serverItem.id);
          if (localItem && localItem._dirty) {
            // Conflict: local has unsaved changes, server also changed
            // Strategy: server wins for version, merge fields
            if (serverItem.version > localItem.version) {
              await this.db.memoryItems.put({
                ...this.memoryFromServer(serverItem),
                _dirty: false,
                _deleted: false,
              });
              conflicts++;
            }
            // Otherwise local wins (will be pushed next cycle)
          } else {
            await this.db.memoryItems.put({
              ...this.memoryFromServer(serverItem),
              _dirty: false,
              _deleted: false,
            });
          }
          pulled++;
        }
        await this.updateSyncMeta('memoryItems');
      }
    } catch (err) {
      errors.push(`pull memory: ${err instanceof Error ? err.message : 'failed'}`);
    }

    // Pull KB rules
    try {
      const meta = await this.getSyncMeta('kbRules');
      const { data: serverRules, error } = await this.supabase
        .from('ernesto_knowledge_rules')
        .select('*')
        .eq('user_id', this.userId)
        .gt('updated_at', meta.lastSyncAt)
        .order('updated_at', { ascending: true });

      if (error) throw error;
      if (serverRules) {
        for (const serverRule of serverRules) {
          const localRule = await this.db.kbRules.get(serverRule.id);
          if (localRule && localRule._dirty) {
            // Server wins if newer
            const serverTime = new Date(serverRule.updated_at).getTime();
            const localTime = new Date(localRule.updated_at).getTime();
            if (serverTime > localTime) {
              await this.db.kbRules.put({ ...serverRule, _dirty: false, _deleted: false });
              conflicts++;
            }
          } else {
            await this.db.kbRules.put({ ...serverRule, _dirty: false, _deleted: false });
          }
          pulled++;
        }
        await this.updateSyncMeta('kbRules');
      }
    } catch (err) {
      errors.push(`pull rules: ${err instanceof Error ? err.message : 'failed'}`);
    }

    // Pull documents
    try {
      const meta = await this.getSyncMeta('documents');
      const { data: serverDocs, error } = await this.supabase
        .from('ernesto_documents')
        .select('*')
        .eq('user_id', this.userId)
        .gt('updated_at', meta.lastSyncAt)
        .order('updated_at', { ascending: true });

      if (error) throw error;
      if (serverDocs) {
        for (const doc of serverDocs) {
          await this.db.documents.put({ ...doc, _dirty: false, _deleted: false });
          pulled++;
        }
        await this.updateSyncMeta('documents');
      }
    } catch (err) {
      errors.push(`pull documents: ${err instanceof Error ? err.message : 'failed'}`);
    }

    return { pulled, conflicts, errors };
  }

  // ── Initial Load (first time or after clearing local DB) ──

  async initialLoad(): Promise<void> {
    this.setStatus('syncing');

    try {
      // Load all user's memory items
      const { data: memoryItems } = await this.supabase
        .from('ernesto_memory_items')
        .select('*')
        .eq('user_id', this.userId)
        .eq('archived', false);

      if (memoryItems?.length) {
        await this.db.memoryItems.bulkPut(
          memoryItems.map(item => ({
            ...this.memoryFromServer(item),
            _dirty: false,
            _deleted: false,
          }))
        );
      }

      // Load all user's KB rules
      const { data: rules } = await this.supabase
        .from('ernesto_knowledge_rules')
        .select('*')
        .eq('user_id', this.userId);

      if (rules?.length) {
        await this.db.kbRules.bulkPut(
          rules.map(rule => ({ ...rule, _dirty: false, _deleted: false }))
        );
      }

      // Load recent documents
      const { data: docs } = await this.supabase
        .from('ernesto_documents')
        .select('*')
        .eq('user_id', this.userId)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (docs?.length) {
        await this.db.documents.bulkPut(
          docs.map(doc => ({ ...doc, _dirty: false, _deleted: false }))
        );
      }

      // Update all sync timestamps
      const now = new Date().toISOString();
      for (const table of ['memoryItems', 'kbRules', 'documents']) {
        await this.db.syncMeta.put({
          id: table,
          lastSyncAt: now,
          lastPushAt: now,
          syncInProgress: false,
        });
      }

      this.setStatus('idle');
    } catch (err) {
      this.setStatus('error', err instanceof Error ? err.message : 'Initial load failed');
      throw err;
    }
  }

  // ── Helpers ──

  private memoryToServer(item: Omit<LocalMemoryItem, '_dirty' | '_deleted'>): Record<string, unknown> {
    return {
      id: item.id,
      user_id: item.user_id,
      level: item.level,
      type: item.type,
      title: item.title,
      content: item.content,
      tags: item.tags,
      carrier: item.carrier,
      confidence: item.confidence,
      usefulness: item.usefulness,
      relevance: item.relevance,
      access_count: item.accessCount,
      source: item.source,
      approved: item.approved,
      pinned: item.pinned,
      archived: item.archived,
      version: item.version,
      promoted_from: item.promotedFrom,
      promoted_at: item.promotedAt,
      last_accessed_at: item.lastAccessedAt,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  private memoryFromServer(server: Record<string, any>): Omit<LocalMemoryItem, '_dirty' | '_deleted'> {
    return {
      id: server.id,
      user_id: server.user_id,
      level: server.level,
      type: server.type,
      title: server.title,
      content: server.content,
      tags: server.tags || [],
      carrier: server.carrier,
      confidence: Number(server.confidence),
      usefulness: Number(server.usefulness),
      relevance: Number(server.relevance),
      accessCount: server.access_count || 0,
      source: server.source,
      approved: server.approved || false,
      pinned: server.pinned || false,
      archived: server.archived || false,
      version: server.version || 1,
      promotedFrom: server.promoted_from,
      promotedAt: server.promoted_at,
      lastAccessedAt: server.last_accessed_at || server.created_at,
      createdAt: server.created_at,
      updatedAt: server.updated_at,
    };
  }

  private async getSyncMeta(tableName: string): Promise<LocalSyncMeta> {
    const meta = await this.db.syncMeta.get(tableName);
    return meta || {
      id: tableName,
      lastSyncAt: '1970-01-01T00:00:00Z',
      lastPushAt: '1970-01-01T00:00:00Z',
      syncInProgress: false,
    };
  }

  private async updateSyncMeta(tableName: string): Promise<void> {
    await this.db.syncMeta.put({
      id: tableName,
      lastSyncAt: new Date().toISOString(),
      lastPushAt: new Date().toISOString(),
      syncInProgress: false,
    });
  }
}

// ── Singleton per user session ──

let activeSyncEngine: SyncEngine | null = null;

export function getSyncEngine(supabase: SupabaseClient, userId: string): SyncEngine {
  if (!activeSyncEngine || (activeSyncEngine as any).userId !== userId) {
    activeSyncEngine?.stop();
    activeSyncEngine = new SyncEngine(supabase, userId);
  }
  return activeSyncEngine;
}

export function stopSyncEngine(): void {
  activeSyncEngine?.stop();
  activeSyncEngine = null;
}
