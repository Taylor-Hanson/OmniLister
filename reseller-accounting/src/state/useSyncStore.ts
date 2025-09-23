import { create } from 'zustand';
import { db } from '../db/client';
import { syncState } from '../db/schema';
import { eq } from 'drizzle-orm';

interface SyncState {
  isOnline: boolean;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  syncError: string | null;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  updateLastSync: (tableName: string) => Promise<void>;
  getLastSync: (tableName: string) => Promise<Date | null>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: true,
  lastSyncAt: null,
  isSyncing: false,
  syncError: null,

  setOnline: (online: boolean) => {
    set({ isOnline: online });
  },

  setSyncing: (syncing: boolean) => {
    set({ isSyncing: syncing });
  },

  setSyncError: (error: string | null) => {
    set({ syncError: error });
  },

  updateLastSync: async (tableName: string) => {
    try {
      const now = new Date();
      const orgId = '00000000-0000-0000-0000-000000000000'; // Mock org ID
      
      await db.insert(syncState).values({
        id: `${orgId}-${tableName}`,
        orgId,
        tableName,
        lastSyncAt: now.getTime(),
        lastSyncToken: now.toISOString(),
      }).onConflictDoUpdate({
        target: [syncState.id],
        set: {
          lastSyncAt: now.getTime(),
          lastSyncToken: now.toISOString(),
        },
      });

      set({ lastSyncAt: now });
    } catch (error) {
      console.error('Failed to update last sync:', error);
    }
  },

  getLastSync: async (tableName: string) => {
    try {
      const orgId = '00000000-0000-0000-0000-000000000000'; // Mock org ID
      const result = await db
        .select()
        .from(syncState)
        .where(eq(syncState.id, `${orgId}-${tableName}`))
        .limit(1);

      if (result.length > 0) {
        return new Date(result[0].lastSyncAt);
      }
      return null;
    } catch (error) {
      console.error('Failed to get last sync:', error);
      return null;
    }
  },
}));
