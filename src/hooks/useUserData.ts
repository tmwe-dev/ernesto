// ============================================================================
// useUserData — Orchestra l'inizializzazione del DB locale per utente
// Carica dati da IndexedDB, avvia il sync engine con Supabase
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useMemoryStore } from '../stores/memory-store';
import { useKBStore } from '../stores/kb-store';
import { SyncEngine, getSyncEngine, stopSyncEngine } from '../lib/sync-engine';
import { getLocalDB } from '../lib/local-db';
import { supabase } from '../lib/supabaseClient';

interface UserDataStatus {
  isReady: boolean;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  error: string | null;
}

export function useUserData(): UserDataStatus {
  const { user } = useAuth();
  const initMemory = useMemoryStore(s => s.initForUser);
  const clearMemory = useMemoryStore(s => s.clearUser);
  const initKB = useKBStore(s => s.initForUser);
  const clearKB = useKBStore(s => s.clearUser);

  const [status, setStatus] = useState<UserDataStatus>({
    isReady: false,
    isLoading: false,
    syncStatus: 'idle',
    error: null,
  });

  const syncEngineRef = useRef<SyncEngine | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id;

    // User logged out
    if (!userId) {
      if (prevUserIdRef.current) {
        clearMemory();
        clearKB();
        stopSyncEngine();
        syncEngineRef.current = null;
        prevUserIdRef.current = null;
        setStatus({ isReady: false, isLoading: false, syncStatus: 'idle', error: null });
      }
      return;
    }

    // Same user, already loaded
    if (userId === prevUserIdRef.current) return;

    // New user login — initialize
    prevUserIdRef.current = userId;
    setStatus(prev => ({ ...prev, isLoading: true, error: null }));

    const init = async () => {
      try {
        const db = getLocalDB(userId);

        // Check if we have local data already
        const localCount = await db.memoryItems.count();

        if (localCount === 0) {
          // First time: pull everything from Supabase into local DB
          const engine = getSyncEngine(supabase, userId);
          await engine.initialLoad();
        }

        // Load from IndexedDB into Zustand stores
        await initMemory(userId);
        await initKB(userId);

        // Start background sync
        const engine = getSyncEngine(supabase, userId);
        syncEngineRef.current = engine;

        engine.onStatusChange((syncStatus) => {
          setStatus(prev => ({
            ...prev,
            syncStatus: syncStatus as UserDataStatus['syncStatus'],
          }));
        });

        engine.start(30000); // Sync every 30 seconds

        setStatus({
          isReady: true,
          isLoading: false,
          syncStatus: 'idle',
          error: null,
        });
      } catch (err) {
        setStatus({
          isReady: false,
          isLoading: false,
          syncStatus: 'error',
          error: err instanceof Error ? err.message : 'Failed to initialize user data',
        });
      }
    };

    init();

    return () => {
      stopSyncEngine();
      syncEngineRef.current = null;
    };
  }, [user?.id]);

  return status;
}

/**
 * Hook to force a manual sync (e.g. after important changes)
 */
export function useForceSync() {
  const { user } = useAuth();

  return async () => {
    if (!user?.id) return;
    const engine = getSyncEngine(supabase, user.id);
    return engine.syncAll();
  };
}
