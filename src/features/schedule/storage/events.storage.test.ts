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

  it('accepts legacy events without a repeat_until field', async () => {
    const legacyEvent = {
      id: 'legacy-repeat-until-1',
      title: 'Legacy Event Without Repeat Until',
      category: '学习',
      start_time: '2026-03-17T08:00:00.000Z',
      end_time: '2026-03-17T09:00:00.000Z',
      repeat: 'daily',
      is_completed: false,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.events, JSON.stringify([legacyEvent]));

    await expect(loadEventsFromStorage()).resolves.toEqual([legacyEvent]);
  });

  it('accepts events with a valid repeat_until field', async () => {
    const repeatingEvent = {
      id: 'repeat-until-valid-1',
      title: 'Repeating Event',
      category: '学习',
      start_time: '2026-03-18T08:00:00.000Z',
      end_time: '2026-03-18T09:00:00.000Z',
      repeat: 'weekly',
      repeat_until: '2026-04-30',
      is_completed: false,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.events, JSON.stringify([repeatingEvent]));

    await expect(loadEventsFromStorage()).resolves.toEqual([repeatingEvent]);
  });

  it('filters out events with invalid repeat_until values', async () => {
    const validEvent = {
      id: 'repeat-until-valid-2',
      title: 'Valid Repeating Event',
      category: '学习',
      start_time: '2026-03-19T08:00:00.000Z',
      end_time: '2026-03-19T09:00:00.000Z',
      repeat: 'weekly',
      repeat_until: '2026-05-01',
      is_completed: false,
    };

    const invalidEvents = [
      {
        ...validEvent,
        id: 'repeat-until-invalid-number',
        repeat_until: 123456,
      },
      {
        ...validEvent,
        id: 'repeat-until-invalid-garbage',
        repeat_until: 'not-a-date',
      },
      {
        ...validEvent,
        id: 'repeat-until-invalid-unparseable',
        repeat_until: '2026-02-30',
      },
    ];

    await AsyncStorage.setItem(
      STORAGE_KEYS.events,
      JSON.stringify([validEvent, ...invalidEvents]),
    );

    await expect(loadEventsFromStorage()).resolves.toEqual([validEvent]);
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
