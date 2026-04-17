import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../../platform/storage/async-storage';
import { TimeSlotRating } from '../types';
import {
  clearRatingsCache,
  getRating,
  listRatings,
  removeRating,
  saveRating,
  subscribeToRatings,
} from './ratings.storage';

const baseRating: TimeSlotRating = {
  id: 'rating-1',
  slot_start: '2026-04-17T08:00:00.000Z',
  slot_end: '2026-04-17T09:00:00.000Z',
  linked_event_id: 'event-1',
  rating: 4,
  efficiency: 2,
  mood: 'focused',
  activity: 'Reading',
  reflection: 'Kept the phone away.',
  created_at: '2026-04-17T09:00:00.000Z',
  updated_at: '2026-04-17T09:00:00.000Z',
  schema_version: 1,
};

describe('ratings storage', () => {
  beforeEach(() => {
    clearRatingsCache();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns an empty initial state', async () => {
    await expect(listRatings()).resolves.toEqual([]);
  });

  it('creates then lists and gets a rating', async () => {
    await saveRating(baseRating);

    await expect(listRatings()).resolves.toEqual([baseRating]);
    await expect(getRating(baseRating.id)).resolves.toEqual(baseRating);
  });

  it('updates then lists and gets a rating with a refreshed updated_at value', async () => {
    await saveRating(baseRating);

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-17T10:30:00.000Z'));

    await saveRating({
      ...baseRating,
      rating: 1,
      efficiency: 5,
      updated_at: '2026-04-17T09:15:00.000Z',
    });

    const expected = {
      ...baseRating,
      rating: 1,
      efficiency: 5,
      updated_at: '2026-04-17T10:30:00.000Z',
    };

    await expect(listRatings()).resolves.toEqual([expected]);
    await expect(getRating(baseRating.id)).resolves.toEqual(expected);
  });

  it('deletes then lists and gets a rating', async () => {
    await saveRating(baseRating);
    await removeRating(baseRating.id);

    await expect(listRatings()).resolves.toEqual([]);
    await expect(getRating(baseRating.id)).resolves.toBeNull();
  });

  it('serializes and deserializes optional empty fields, emoji, and long strings', async () => {
    const longReflection = 'deep work '.repeat(80);
    const edgeCaseRating: TimeSlotRating = {
      ...baseRating,
      id: 'rating-edge-case',
      linked_event_id: undefined,
      rating: 5,
      efficiency: 1,
      mood: '',
      activity: 'Debugging unicode 🚀✨',
      reflection: longReflection,
      synced_at: null,
    };

    await saveRating(edgeCaseRating);
    clearRatingsCache();

    await expect(listRatings()).resolves.toEqual([edgeCaseRating]);
  });

  it('saves and reads rating and efficiency as independent values', async () => {
    await saveRating({
      ...baseRating,
      rating: 2,
      efficiency: 5,
    });

    const saved = await getRating(baseRating.id);

    expect(saved?.rating).toBe(2);
    expect(saved?.efficiency).toBe(5);
  });

  it('notifies listeners after storage mutations', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToRatings(listener);

    await saveRating(baseRating);
    await removeRating(baseRating.id);

    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    await saveRating({ ...baseRating, id: 'rating-after-unsubscribe' });

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('uses the ratings AsyncStorage key', async () => {
    await saveRating(baseRating);

    await expect(AsyncStorage.getItem(STORAGE_KEYS.ratings)).resolves.toBe(
      JSON.stringify([baseRating]),
    );
  });
});
