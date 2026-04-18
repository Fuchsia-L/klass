import AsyncStorage from '@react-native-async-storage/async-storage';
import { localRatingRepository } from '../storage';
import { CloudRatingApiClient } from './api-client';
import { getSyncScheduler, type SyncScheduler } from './sync-scheduler';

export const SYNC_TOKEN_STORAGE_KEY = 'cs-rn:sync-token';

export async function loadSyncToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SYNC_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function saveSyncToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (trimmed === '') {
    await clearSyncToken();
    return;
  }
  await AsyncStorage.setItem(SYNC_TOKEN_STORAGE_KEY, trimmed);
}

export async function clearSyncToken(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_TOKEN_STORAGE_KEY);
}

export function getConfiguredSyncScheduler(): SyncScheduler {
  return getSyncScheduler({
    repository: localRatingRepository,
    apiClient: new CloudRatingApiClient({
      getToken: loadSyncToken,
    }),
  });
}
