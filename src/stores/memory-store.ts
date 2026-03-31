// ============================================================================
// Memory Store (Zustand + Local DB) — Hydra Learning System
// User-isolated: ogni utente ha il proprio database locale (IndexedDB)
// Sync in background verso Supabase per backup/multi-device
// ============================================================================

import { create } from 'zustand';
import {
  MemoryItem,
  MemoryLevel,
  MemoryItemType,
  SystemHealth,
  PROMOTION_THRESHOLDS,
  MEMORY_DECAY_CONFIG,
} from '../types/index';
import { getLocalDB, localSearchMemory, LocalMemoryItem } from '../lib/local-db';

interface MemoryStoreState {
  // State
  items: MemoryItem[];
  userId: string | null;
  isLoaded: boolean;
  lastDecayCheck: string;

  // Init
  initForUser: (userId: string) => Promise<void>;
  clearUser: () => void;

  // CRUD
  addItem: (item: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<MemoryItem>;
  updateItem: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  archiveItem: (id: string) => Promise<void>;

  // Learning
  learnFromCorrection: (carrier: string, correction: string, tags: string[]) => Promise<MemoryItem>;
  learnFromPattern: (pattern: string, carrier?: string, tags?: string[]) => Promise<MemoryItem>;

  // Retrieval (reads from local IndexedDB — instant)
  retrieveForContext: (query: string, carrier?: string, maxItems?: number) => Promise<MemoryItem[]>;
  searchItems: (query: string, filters?: { carrier?: string; level?: MemoryLevel }) => MemoryItem[];
  getItemById: (id: string) => MemoryItem | undefined;

  // Promotion
  checkAndPromote: () => Promise<{ promoted: string[]; total: number }>;
  promoteItem: (id: string) => Promise<boolean>;

  // Decay
  applyDecay: () => Promise<{ decayed: number; removed: number }>;

  // Stats
  getHealth: () => SystemHealth;
  getItemsByLevel: (level: MemoryLevel) => MemoryItem[];
  incrementAccess: (id: string) => Promise<void>;
}

const generateId = () => `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const now = () => new Date().toISOString();

// Convert between local DB format and store format
const localToStore = (local: LocalMemoryItem): MemoryItem => ({
  id: local.id,
  level: local.level as MemoryLevel,
  type: local.type as MemoryItemType,
  title: local.title,
  content: local.content,
  tags: local.tags,
  carrier: local.carrier,
  confidence: local.confidence,
  usefulness: local.usefulness,
  relevance: local.relevance,
  accessCount: local.accessCount,
  source: local.source,
  approved: local.approved,
  pinned: local.pinned,
  lastAccessedAt: local.lastAccessedAt,
  createdAt: local.createdAt,
  updatedAt: local.updatedAt,
  version: local.version,
  promotedFrom: local.promotedFrom as MemoryLevel | undefined,
  promotedAt: local.promotedAt,
});

const storeToLocal = (item: MemoryItem, userId: string): LocalMemoryItem => ({
  id: item.id,
  user_id: userId,
  level: item.level,
  type: item.type,
  title: item.title,
  content: item.content,
  tags: item.tags,
  carrier: item.carrier,
  confidence: item.confidence,
  usefulness: item.usefulness,
  relevance: item.relevance,
  accessCount: item.accessCount,
  source: item.source,
  approved: item.approved,
  pinned: item.pinned,
  archived: false,
  version: item.version,
  promotedFrom: item.promotedFrom,
  promotedAt: item.promotedAt,
  lastAccessedAt: item.lastAccessedAt,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  _dirty: true,
  _deleted: false,
});

export const useMemoryStore = create<MemoryStoreState>()(
  (set, get) => ({
    items: [],
    userId: null,
    isLoaded: false,
    lastDecayCheck: now(),

    // ── Init: load user's data from local IndexedDB ──
    initForUser: async (userId: string) => {
      const db = getLocalDB(userId);
      const localItems = await db.memoryItems
        .filter(item => !item._deleted && !item.archived)
        .toArray();

      set({
        userId,
        items: localItems.map(localToStore),
        isLoaded: true,
      });
    },

    clearUser: () => {
      set({ userId: null, items: [], isLoaded: false });
    },

    // ── CRUD (writes to IndexedDB first, marks dirty for sync) ──

    addItem: async (itemData) => {
      const { userId } = get();
      if (!userId) throw new Error('User not initialized');

      const id = generateId();
      const newItem: MemoryItem = {
        ...itemData,
        id,
        createdAt: now(),
        updatedAt: now(),
        version: 1,
      };

      // Write to IndexedDB immediately
      const db = getLocalDB(userId);
      await db.memoryItems.put(storeToLocal(newItem, userId));

      // Update in-memory state
      set(state => ({ items: [...state.items, newItem] }));

      return newItem;
    },

    updateItem: async (id, updates) => {
      const { userId } = get();
      if (!userId) return;

      const db = getLocalDB(userId);
      const existing = await db.memoryItems.get(id);
      if (!existing) return;

      const updatedLocal: LocalMemoryItem = {
        ...existing,
        ...updates as any,
        updatedAt: now(),
        version: existing.version + 1,
        _dirty: true,
      };
      await db.memoryItems.put(updatedLocal);

      set(state => ({
        items: state.items.map(item =>
          item.id === id
            ? { ...item, ...updates, updatedAt: now(), version: item.version + 1 }
            : item
        ),
      }));
    },

    removeItem: async (id) => {
      const { userId } = get();
      if (!userId) return;

      const db = getLocalDB(userId);
      const existing = await db.memoryItems.get(id);
      if (existing) {
        // Soft delete — will be pushed to server on next sync
        await db.memoryItems.update(id, { _deleted: true, _dirty: true });
      }

      set(state => ({ items: state.items.filter(item => item.id !== id) }));
    },

    archiveItem: async (id) => {
      const store = get();
      const item = store.items.find(i => i.id === id);
      if (item) {
        await store.updateItem(id, {
          level: 'L3' as MemoryLevel,
          relevance: Math.max(item.relevance * 0.5, 0.1),
        });
      }
    },

    // ── Learning ──

    learnFromCorrection: async (carrier, correction, tags) => {
      return get().addItem({
        level: 'L1',
        type: 'correction',
        title: `Correction: ${correction.substring(0, 50)}`,
        content: correction,
        tags: ['correction', ...tags],
        carrier,
        confidence: 0.7,
        usefulness: 50,
        relevance: 0.8,
        accessCount: 0,
        source: 'user_correction',
        approved: false,
        pinned: false,
        lastAccessedAt: now(),
      });
    },

    learnFromPattern: async (pattern, carrier?, tags = []) => {
      return get().addItem({
        level: 'L1',
        type: 'pattern',
        title: `Pattern: ${pattern.substring(0, 50)}`,
        content: pattern,
        tags: ['pattern', ...tags],
        carrier,
        confidence: 0.6,
        usefulness: 40,
        relevance: 0.7,
        accessCount: 0,
        source: 'ai_detected',
        approved: false,
        pinned: false,
        lastAccessedAt: now(),
      });
    },

    // ── Retrieval (from local IndexedDB — sub-ms reads) ──

    retrieveForContext: async (query, carrier?, maxItems = 20) => {
      const { userId } = get();
      if (!userId) return [];

      const db = getLocalDB(userId);
      const results = await localSearchMemory(db, query, carrier, maxItems);

      // Increment access for retrieved items (fire-and-forget)
      for (const item of results.slice(0, maxItems)) {
        get().incrementAccess(item.id).catch(() => {});
      }

      return results.map(localToStore);
    },

    searchItems: (query, filters) => {
      const { items } = get();
      const lowerQuery = query.toLowerCase();

      return items.filter(item => {
        const matchesQuery =
          item.title.toLowerCase().includes(lowerQuery) ||
          item.content.toLowerCase().includes(lowerQuery) ||
          item.tags.some(t => t.toLowerCase().includes(lowerQuery));
        const matchesLevel = !filters?.level || item.level === filters.level;
        const matchesCarrier = !filters?.carrier || item.carrier === filters.carrier;
        return matchesQuery && matchesLevel && matchesCarrier;
      });
    },

    getItemById: (id) => get().items.find(item => item.id === id),

    // ── Promotion ──

    checkAndPromote: async () => {
      const store = get();
      const promoted: string[] = [];

      for (const item of store.items) {
        let shouldPromote = false;

        if (item.level === 'L1') {
          const t = PROMOTION_THRESHOLDS.L1_TO_L2;
          shouldPromote = item.accessCount >= t.accessCount && item.usefulness >= t.usefulness && item.confidence >= t.confidence;
        } else if (item.level === 'L2') {
          const t = PROMOTION_THRESHOLDS.L2_TO_L3;
          shouldPromote = item.accessCount >= t.accessCount && item.usefulness >= t.usefulness && item.confidence >= t.confidence && item.approved === t.approved;
        }

        if (shouldPromote) {
          const success = await store.promoteItem(item.id);
          if (success) promoted.push(item.id);
        }
      }

      return { promoted, total: store.items.length };
    },

    promoteItem: async (id) => {
      const store = get();
      const item = store.getItemById(id);
      if (!item) return false;

      const nextLevel: MemoryLevel = item.level === 'L1' ? 'L2' : item.level === 'L2' ? 'L3' : 'L3';
      if (nextLevel === item.level) return false;

      await store.updateItem(id, {
        level: nextLevel,
        promotedFrom: item.level,
        promotedAt: now(),
        relevance: Math.min(item.relevance * 1.2, 1.0),
      });

      return true;
    },

    // ── Decay ──

    applyDecay: async () => {
      const store = get();
      const lastCheck = new Date(store.lastDecayCheck);
      const hoursSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCheck < MEMORY_DECAY_CONFIG.decayCheckIntervalHours) {
        return { decayed: 0, removed: 0 };
      }

      const decayFactor = 1 - MEMORY_DECAY_CONFIG.decayRatePerDay * Math.ceil(hoursSinceCheck / 24);
      let decayed = 0;
      let removed = 0;

      for (const item of store.items) {
        const newRelevance = item.relevance * decayFactor;
        if (newRelevance < MEMORY_DECAY_CONFIG.minRelevance) {
          await store.removeItem(item.id);
          removed++;
        } else if (newRelevance !== item.relevance) {
          await store.updateItem(item.id, { relevance: newRelevance });
          decayed++;
        }
      }

      set({ lastDecayCheck: now() });
      return { decayed, removed };
    },

    // ── Stats ──

    getHealth: (): SystemHealth => {
      const { items } = get();
      const l1Count = items.filter(i => i.level === 'L1').length;
      const l2Count = items.filter(i => i.level === 'L2').length;
      const l3Count = items.filter(i => i.level === 'L3').length;

      const avgConfidence = items.length > 0
        ? items.reduce((sum, i) => sum + i.confidence, 0) / items.length
        : 0;

      const promotedCount = items.filter(i => i.promotedAt).length;
      const avgUsefulness = items.length > 0
        ? items.reduce((sum, i) => sum + i.usefulness, 0) / items.length
        : 0;

      const learningScore = (promotedCount / Math.max(1, items.length)) * 50 + (avgUsefulness / 100) * 50;

      return {
        totalMemoryItems: items.length,
        l1Count, l2Count, l3Count,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        kbRulesCount: 0,
        importsCompleted: 0,
        learningScore: Math.round(learningScore),
      };
    },

    getItemsByLevel: (level) => get().items.filter(item => item.level === level),

    incrementAccess: async (id) => {
      const store = get();
      const item = store.getItemById(id);
      if (item) {
        await store.updateItem(id, {
          accessCount: item.accessCount + 1,
          lastAccessedAt: now(),
        });
      }
    },
  })
);

// ── Helper Hooks ──

export const useMemoryStats = () => useMemoryStore(s => s.getHealth());

export const useContextualMemory = (query: string, carrier?: string) => {
  const store = useMemoryStore();
  // Note: this is synchronous fallback; use retrieveForContext for async IndexedDB reads
  return store.searchItems(query, { carrier });
};

export const useMemoryMaintenance = () => {
  const store = useMemoryStore();
  return {
    checkPromotion: () => store.checkAndPromote(),
    applyDecay: () => store.applyDecay(),
  };
};

export const useLearning = () => {
  const store = useMemoryStore();
  return {
    correction: (carrier: string, text: string, tags: string[]) =>
      store.learnFromCorrection(carrier, text, tags),
    pattern: (text: string, carrier?: string, tags?: string[]) =>
      store.learnFromPattern(text, carrier, tags),
  };
};
