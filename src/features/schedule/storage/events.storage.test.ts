import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../../platform/storage/async-storage';
import { loadEventsFromStorage, clearEventsCache } from './events.storage';

describe('events storage compatibility', () => {
  beforeEach(() => {
    clearEventsCache();
  });

  it('accepts legacy events without a source field', async () => {
    const legacyEvent = {
      id: 'legacy-1',
      title: 'Legacy Event',
      category: '学习',
      start_time: '2026-03-16T08:00:00.000Z',
      end_time: '2026-03-16T09:00:00.000Z',
      repeat: 'none',
      is_completed: false,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.events, JSON.stringify([legacyEvent]));

    await expect(loadEventsFromStorage()).resolves.toEqual([legacyEvent]);
  });

  it('accepts events with the new source field', async () => {
    const importedEvent = {
      id: 'import-1',
      title: 'Imported Event',
      category: '学习',
      start_time: '2026-03-16T10:00:00.000Z',
      end_time: '2026-03-16T11:00:00.000Z',
      repeat: 'weekly',
      source: 'whut-import',
      is_completed: false,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.events, JSON.stringify([importedEvent]));

    await expect(loadEventsFromStorage()).resolves.toEqual([importedEvent]);
  });
});
