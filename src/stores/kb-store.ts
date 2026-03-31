// ============================================================================
// Knowledge Base Store (Zustand + Local DB)
// User-isolated: ogni utente ha le proprie regole in IndexedDB locale
// Sync bidirezionale con Supabase per backup/multi-device
// ============================================================================

import { create } from 'zustand';
import { KBRule, MemoryItemType } from '../types/index';
import { useMemoryStore } from './memory-store';
import { getLocalDB, localSearchRules, LocalKBRule } from '../lib/local-db';

interface KBStoreState {
  rules: KBRule[];
  userId: string | null;
  isLoaded: boolean;
  lastSyncTime: string;

  // Init
  initForUser: (userId: string) => Promise<void>;
  clearUser: () => void;

  // CRUD
  addRule: (rule: Omit<KBRule, 'id' | 'created_at' | 'updated_at'>) => Promise<KBRule>;
  updateRule: (id: string, updates: Partial<KBRule>) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
  activateRule: (id: string) => Promise<void>;
  deactivateRule: (id: string) => Promise<void>;

  // Retrieval
  getRuleById: (id: string) => KBRule | undefined;
  getRulesByCarrier: (carrierCode: string) => KBRule[];
  getRulesByType: (ruleType: string) => KBRule[];
  searchRules: (query: string, carrier?: string) => KBRule[];
  getActiveRules: (carrier?: string) => KBRule[];

  // Async search (from IndexedDB — instant)
  searchRulesLocal: (query: string, carrier?: string) => Promise<KBRule[]>;

  // Sync with Memory
  syncRuleToMemory: (ruleId: string) => Promise<string | null>;
  syncMemoryToRule: (memoryItemId: string, ruleId: string) => Promise<void>;

  // Bulk Operations
  importRules: (rules: KBRule[]) => Promise<void>;
  exportRules: (carrier?: string) => KBRule[];
}

const generateId = () => `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const now = () => new Date().toISOString();

const localToRule = (local: LocalKBRule): KBRule => ({
  id: local.id,
  carrier_code: local.carrier_code,
  operation_type: local.operation_type,
  rule_type: local.rule_type,
  title: local.title,
  content: local.content,
  priority: local.priority,
  tags: local.tags,
  source: local.source,
  source_document_id: local.source_document_id,
  memory_item_id: local.memory_item_id,
  is_active: local.is_active,
  metadata: local.metadata,
  created_at: local.created_at,
  updated_at: local.updated_at,
});

const ruleToLocal = (rule: KBRule, userId: string): LocalKBRule => ({
  id: rule.id,
  user_id: userId,
  carrier_code: rule.carrier_code,
  operation_type: rule.operation_type,
  rule_type: rule.rule_type,
  title: rule.title,
  content: rule.content,
  priority: rule.priority,
  tags: rule.tags,
  source: rule.source,
  source_document_id: rule.source_document_id,
  memory_item_id: rule.memory_item_id,
  is_active: rule.is_active,
  metadata: rule.metadata || {},
  created_at: rule.created_at,
  updated_at: rule.updated_at,
  _dirty: true,
  _deleted: false,
});

export const useKBStore = create<KBStoreState>()(
  (set, get) => ({
    rules: [],
    userId: null,
    isLoaded: false,
    lastSyncTime: now(),

    // ── Init: carica regole utente da IndexedDB locale ──
    initForUser: async (userId: string) => {
      const db = getLocalDB(userId);
      const localRules = await db.kbRules
        .filter(r => !r._deleted)
        .toArray();

      set({
        userId,
        rules: localRules.map(localToRule),
        isLoaded: true,
      });
    },

    clearUser: () => {
      set({ userId: null, rules: [], isLoaded: false });
    },

    // ── CRUD (scrivi su IndexedDB, marca dirty per sync) ──

    addRule: async (ruleData) => {
      const { userId } = get();
      if (!userId) throw new Error('User not initialized');

      const id = generateId();
      const newRule: KBRule = {
        ...ruleData,
        id,
        created_at: now(),
        updated_at: now(),
      };

      const db = getLocalDB(userId);
      await db.kbRules.put(ruleToLocal(newRule, userId));

      set(state => ({ rules: [...state.rules, newRule] }));

      // Sync to memory (fire-and-forget)
      get().syncRuleToMemory(id).catch(() => {});

      return newRule;
    },

    updateRule: async (id, updates) => {
      const { userId } = get();
      if (!userId) return;

      const db = getLocalDB(userId);
      const existing = await db.kbRules.get(id);
      if (!existing) return;

      const updated: LocalKBRule = {
        ...existing,
        ...updates as any,
        updated_at: now(),
        _dirty: true,
      };
      await db.kbRules.put(updated);

      set(state => ({
        rules: state.rules.map(rule =>
          rule.id === id ? { ...rule, ...updates, updated_at: now() } : rule
        ),
      }));
    },

    removeRule: async (id) => {
      const { userId } = get();
      if (!userId) return;

      const rule = get().getRuleById(id);

      // Remove linked memory item
      if (rule?.memory_item_id) {
        useMemoryStore.getState().removeItem(rule.memory_item_id);
      }

      const db = getLocalDB(userId);
      const existing = await db.kbRules.get(id);
      if (existing) {
        await db.kbRules.update(id, { _deleted: true, _dirty: true });
      }

      set(state => ({ rules: state.rules.filter(r => r.id !== id) }));
    },

    activateRule: async (id) => get().updateRule(id, { is_active: true }),
    deactivateRule: async (id) => get().updateRule(id, { is_active: false }),

    // ── Retrieval (in-memory, from Zustand state) ──

    getRuleById: (id) => get().rules.find(r => r.id === id),

    getRulesByCarrier: (carrierCode) =>
      get().rules.filter(r => r.carrier_code === carrierCode),

    getRulesByType: (ruleType) =>
      get().rules.filter(r => r.rule_type === ruleType),

    searchRules: (query, carrier?) => {
      const lowerQuery = query.toLowerCase();
      return get().rules.filter(rule => {
        const matchesQuery =
          rule.title.toLowerCase().includes(lowerQuery) ||
          rule.content.toLowerCase().includes(lowerQuery) ||
          rule.tags.some(t => t.toLowerCase().includes(lowerQuery));
        const matchesCarrier = !carrier || rule.carrier_code === carrier;
        return matchesQuery && matchesCarrier;
      });
    },

    getActiveRules: (carrier?) =>
      get().rules.filter(r => {
        return r.is_active && (!carrier || r.carrier_code === carrier);
      }),

    // ── Async search da IndexedDB (per query pesanti) ──

    searchRulesLocal: async (query, carrier?) => {
      const { userId } = get();
      if (!userId) return [];
      const db = getLocalDB(userId);
      const results = await localSearchRules(db, query, carrier);
      return results.map(localToRule);
    },

    // ── Sync with Memory ──

    syncRuleToMemory: async (ruleId) => {
      const rule = get().getRuleById(ruleId);
      if (!rule) return null;

      const memoryStore = useMemoryStore.getState();
      let memoryItemId = rule.memory_item_id;

      if (memoryItemId) {
        await memoryStore.updateItem(memoryItemId, {
          title: rule.title,
          content: rule.content,
          tags: rule.tags,
          carrier: rule.carrier_code,
          confidence: 0.85,
          usefulness: 75,
          relevance: 0.9,
        });
      } else {
        const memoryType: MemoryItemType = 'rule';
        const newItem = await memoryStore.addItem({
          level: 'L1',
          type: memoryType,
          title: rule.title,
          content: rule.content,
          tags: rule.tags,
          carrier: rule.carrier_code,
          confidence: 0.85,
          usefulness: 75,
          relevance: 0.9,
          accessCount: 0,
          source: `kb_rule_${rule.id}`,
          approved: rule.is_active,
          pinned: rule.priority >= 8,
          lastAccessedAt: now(),
        });
        memoryItemId = newItem.id;
        await get().updateRule(ruleId, { memory_item_id: memoryItemId });
      }

      return memoryItemId;
    },

    syncMemoryToRule: async (memoryItemId, ruleId) => {
      const memoryStore = useMemoryStore.getState();
      const memoryItem = memoryStore.getItemById(memoryItemId);
      if (!memoryItem) return;

      await get().updateRule(ruleId, {
        memory_item_id: memoryItemId,
        title: memoryItem.title,
        content: memoryItem.content,
        tags: memoryItem.tags,
        is_active: memoryItem.approved,
      });
    },

    // ── Bulk Operations ──

    importRules: async (newRules) => {
      const { userId } = get();
      if (!userId) return;

      const db = getLocalDB(userId);
      await db.kbRules.bulkPut(newRules.map(r => ruleToLocal(r, userId)));

      set(state => ({ rules: [...state.rules, ...newRules] }));

      for (const rule of newRules) {
        get().syncRuleToMemory(rule.id).catch(() => {});
      }
    },

    exportRules: (carrier?) => {
      const { rules } = get();
      return carrier ? rules.filter(r => r.carrier_code === carrier) : [...rules];
    },
  })
);

// ── Helper Hooks ──

export const useSearchRules = (query: string, carrier?: string, ruleType?: string) => {
  const store = useKBStore();
  const results = store.searchRules(query, carrier);
  return ruleType ? results.filter(r => r.rule_type === ruleType) : results;
};

export const useCarrierRules = (carrierCode: string) =>
  useKBStore(s => s.getActiveRules(carrierCode));

export const useRulesByCarrier = () => {
  const rules = useKBStore(s => s.rules);
  const carriers = new Map<string, KBRule[]>();
  rules.forEach(rule => {
    const code = rule.carrier_code || 'UNASSIGNED';
    if (!carriers.has(code)) carriers.set(code, []);
    carriers.get(code)!.push(rule);
  });
  return carriers;
};

export const useKBStats = () => {
  const rules = useKBStore(s => s.rules);
  const activeCount = rules.filter(r => r.is_active).length;
  const carriers = new Set(rules.map(r => r.carrier_code).filter(Boolean)).size;
  const typeDistribution = rules.reduce((acc, rule) => {
    acc[rule.rule_type] = (acc[rule.rule_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalRules: rules.length,
    activeRules: activeCount,
    carrierCount: carriers,
    typeDistribution,
    avgPriority: rules.length > 0 ? Math.round(rules.reduce((sum, r) => sum + r.priority, 0) / rules.length) : 0,
  };
};

export const useCreateRuleFromCorrection = () => {
  const kbStore = useKBStore();
  return (title: string, content: string, carrier: string, operationType: string, tags: string[] = [], priority = 5) => {
    return kbStore.addRule({
      carrier_code: carrier,
      operation_type: operationType,
      rule_type: 'correction_derived',
      title,
      content,
      priority,
      tags,
      is_active: false,
      source: 'ai_correction',
    });
  };
};

export const useLinkMemoryToRule = () => {
  const kbStore = useKBStore();
  return (memoryItemId: string, ruleId: string) => {
    kbStore.syncMemoryToRule(memoryItemId, ruleId);
  };
};
