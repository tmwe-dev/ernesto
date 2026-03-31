// ============================================================================
// ERNESTO Local-First Database (IndexedDB via Dexie.js)
// Each user gets an isolated database: ernesto_db_{userId}
// Provides instant reads for KB, Memory, and chat — syncs to Supabase in background
// ============================================================================

import Dexie, { Table } from 'dexie';

// ── Schema Types ──

export interface LocalMemoryItem {
  id: string;
  user_id: string;
  level: 'L1' | 'L2' | 'L3';
  type: string;
  title: string;
  content: string;
  tags: string[];
  carrier?: string;
  confidence: number;
  usefulness: number;
  relevance: number;
  accessCount: number;
  source: string;
  approved: boolean;
  pinned: boolean;
  archived: boolean;
  version: number;
  promotedFrom?: string;
  promotedAt?: string;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
  _dirty: boolean;     // needs sync to server
  _deleted: boolean;    // soft delete pending sync
}

export interface LocalKBRule {
  id: string;
  user_id: string;
  carrier_code?: string;
  operation_type: string;
  rule_type: string;
  title: string;
  content: string;
  priority: number;
  tags: string[];
  source: string;
  source_document_id?: string;
  memory_item_id?: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  _dirty: boolean;
  _deleted: boolean;
}

export interface LocalDocument {
  id: string;
  user_id: string;
  job_id: string;
  file_name: string;
  carrier?: string;
  document_type: string;
  report_text?: string;
  structured_data: Record<string, unknown>;
  summary: Record<string, unknown>;
  confidence: number;
  status: string;
  conversation_summary?: string;
  total_messages: number;
  created_at: string;
  updated_at: string;
  _dirty: boolean;
  _deleted: boolean;
}

export interface LocalChatMessage {
  id: string;
  user_id: string;
  document_id: string;
  role: 'user' | 'assistant' | 'system_summary';
  content: string;
  actions: unknown[];
  message_index: number;
  created_at: string;
  _dirty: boolean;
  _deleted: boolean;
}

export interface LocalSyncMeta {
  id: string;           // table name
  lastSyncAt: string;   // ISO timestamp of last successful sync
  lastPushAt: string;   // ISO timestamp of last successful push
  syncInProgress: boolean;
}

// ── Database Class ──

export class ErnestoLocalDB extends Dexie {
  memoryItems!: Table<LocalMemoryItem, string>;
  kbRules!: Table<LocalKBRule, string>;
  documents!: Table<LocalDocument, string>;
  chatMessages!: Table<LocalChatMessage, string>;
  syncMeta!: Table<LocalSyncMeta, string>;

  constructor(userId: string) {
    // Each user gets their own isolated IndexedDB
    super(`ernesto_db_${userId}`);

    this.version(1).stores({
      memoryItems: 'id, user_id, level, carrier, [user_id+level], [user_id+carrier], [user_id+archived], _dirty, updatedAt',
      kbRules: 'id, user_id, carrier_code, rule_type, is_active, [user_id+carrier_code], [user_id+is_active], _dirty, updated_at',
      documents: 'id, user_id, job_id, carrier, status, [user_id+status], _dirty, updated_at',
      chatMessages: 'id, user_id, document_id, [document_id+message_index], _dirty, created_at',
      syncMeta: 'id',
    });
  }
}

// ── Database Instance Manager ──
// Maintains one DB instance per user session

const dbInstances = new Map<string, ErnestoLocalDB>();

export function getLocalDB(userId: string): ErnestoLocalDB {
  if (!dbInstances.has(userId)) {
    const db = new ErnestoLocalDB(userId);
    dbInstances.set(userId, db);
  }
  return dbInstances.get(userId)!;
}

export function closeLocalDB(userId: string): void {
  const db = dbInstances.get(userId);
  if (db) {
    db.close();
    dbInstances.delete(userId);
  }
}

export async function deleteLocalDB(userId: string): Promise<void> {
  closeLocalDB(userId);
  await Dexie.delete(`ernesto_db_${userId}`);
}

// ── Quick Query Helpers ──

export async function localSearchMemory(
  db: ErnestoLocalDB,
  query: string,
  carrier?: string,
  maxItems = 20
): Promise<LocalMemoryItem[]> {
  const lowerQuery = query.toLowerCase();

  let collection = db.memoryItems
    .where('_deleted').equals(0) // not deleted
    .filter(item => {
      if (item._deleted) return false;
      if (item.archived) return false;
      if (carrier && item.carrier !== carrier) return false;

      return (
        item.title.toLowerCase().includes(lowerQuery) ||
        item.content.toLowerCase().includes(lowerQuery) ||
        item.tags.some(t => t.toLowerCase().includes(lowerQuery))
      );
    });

  const results = await collection.toArray();

  // Sort by composite score: confidence * 0.4 + usefulness * 0.003 + recency * 0.15
  results.sort((a, b) => {
    const scoreA = a.confidence * 0.4 + (a.usefulness / 100) * 0.35 + (a.pinned ? 0.1 : 0);
    const scoreB = b.confidence * 0.4 + (b.usefulness / 100) * 0.35 + (b.pinned ? 0.1 : 0);
    return scoreB - scoreA;
  });

  return results.slice(0, maxItems);
}

export async function localSearchRules(
  db: ErnestoLocalDB,
  query: string,
  carrier?: string
): Promise<LocalKBRule[]> {
  const lowerQuery = query.toLowerCase();

  const results = await db.kbRules
    .filter(rule => {
      if (rule._deleted) return false;
      if (!rule.is_active) return false;
      if (carrier && rule.carrier_code !== carrier) return false;

      return (
        rule.title.toLowerCase().includes(lowerQuery) ||
        rule.content.toLowerCase().includes(lowerQuery) ||
        rule.tags.some(t => t.toLowerCase().includes(lowerQuery))
      );
    })
    .toArray();

  results.sort((a, b) => b.priority - a.priority);
  return results;
}

export async function localGetDirtyRecords<T extends { _dirty: boolean; _deleted: boolean }>(
  table: Table<T, string>
): Promise<T[]> {
  return table.filter(r => r._dirty || r._deleted).toArray();
}
