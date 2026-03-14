import { loadJSON, saveJSON, STORAGE_KEYS } from '../../../platform/storage/async-storage';
import { SemesterConfig } from '../types';

export async function loadSemesterConfig(): Promise<SemesterConfig | null> {
  return loadJSON<SemesterConfig>(STORAGE_KEYS.semester);
}

export async function saveSemesterConfig(config: SemesterConfig): Promise<void> {
  await saveJSON(STORAGE_KEYS.semester, config);
}
