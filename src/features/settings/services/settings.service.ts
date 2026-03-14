import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSemesterConfig, saveSemesterConfig } from '../../schedule';
import { SemesterConfig } from '../../schedule/types';
import { STORAGE_KEYS } from '../../../platform/storage/async-storage';

export type SettingsPayload = {
  semester: SemesterConfig | null;
};

export async function loadSettings(): Promise<SettingsPayload> {
  return {
    semester: await loadSemesterConfig(),
  };
}

export async function saveSemesterSettings(config: SemesterConfig): Promise<void> {
  await saveSemesterConfig(config);
}

export async function clearAllData(): Promise<void> {
  const keys = Object.values(STORAGE_KEYS);
  await AsyncStorage.multiRemove(keys);
}
