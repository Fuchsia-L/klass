import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSemester,
  resetEventsState,
  resetSemesterState,
  saveSemester,
} from '../../schedule';
import { SemesterConfig } from '../../schedule/types';
import { STORAGE_KEYS } from '../../../platform/storage/async-storage';

export type SettingsPayload = {
  semester: SemesterConfig | null;
};

export async function loadSettings(): Promise<SettingsPayload> {
  return {
    semester: await loadSemester(),
  };
}

export async function saveSemesterSettings(config: SemesterConfig): Promise<void> {
  await saveSemester(config);
}

export async function clearAllData(): Promise<void> {
  const keys = Object.values(STORAGE_KEYS);
  await AsyncStorage.multiRemove(keys);
  resetEventsState();
  resetSemesterState();
}
