import { loadSemesterConfig, saveSemesterConfig } from '../storage';
import { SemesterConfig } from '../types';

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export async function loadSemester(): Promise<SemesterConfig | null> {
  return loadSemesterConfig();
}

export async function saveSemester(config: SemesterConfig): Promise<void> {
  await saveSemesterConfig(config);
  notify();
}

export function subscribeToSemester(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetSemesterState(): void {
  notify();
}
