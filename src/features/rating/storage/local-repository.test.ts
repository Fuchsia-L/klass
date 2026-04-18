import { TimeSlotRating } from '../types';
import { LocalRatingRepository } from './local-repository';
import { clearRatingsCache, listRatings as storageListRatings } from './ratings.storage';

const ISO_MS_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function makeRating(
  id: string,
  overrides: Partial<TimeSlotRating> = {},
): TimeSlotRating {
  return {
    id,
    slot_start: '2026-04-17T08:00:00.000Z',
    slot_end: '2026-04-17T09:00:00.000Z',
    rating: 4,
    efficiency: 3,
    mood: 'focused',
    activity: 'reading',
    reflection: 'kept the phone away',
    created_at: '2026-04-17T09:00:00.000Z',
    updated_at: '2026-04-17T09:00:00.000Z',
    synced_at: undefined,
    schema_version: 1,
    ...overrides,
  };
}

describe('LocalRatingRepository', () => {
  const repository = new LocalRatingRepository();

  beforeEach(() => {
    clearRatingsCache();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns only records whose synced_at is null or undefined from listPendingSync', async () => {
    const unsyncedUndefined = makeRating('unsynced-undefined');
    const unsyncedNull = makeRating('unsynced-null', { synced_at: null });
    const synced = makeRating('synced', { synced_at: '2026-04-17T10:00:00.000Z' });

    await repository.save(unsyncedUndefined);
    await repository.save(unsyncedNull);
    await repository.save(synced);

    await expect(repository.listPendingSync()).resolves.toEqual([
      unsyncedUndefined,
      unsyncedNull,
    ]);
  });

  it('removes a record from pending sync after markSynced', async () => {
    const unsynced = makeRating('unsynced');
    await repository.save(unsynced);

    await expect(repository.listPendingSync()).resolves.toEqual([unsynced]);

    await repository.markSynced('unsynced', '2026-04-17T10:00:00.000Z');

    await expect(repository.listPendingSync()).resolves.toEqual([]);
  });

  it('writes a tombstone preserving original fields when removing an active record', async () => {
    const active = makeRating('to-tombstone', {
      synced_at: '2026-04-17T10:00:00.000Z',
    });
    await repository.save(active);

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-17T11:00:00.123Z'));

    await repository.remove('to-tombstone');

    const stored = await storageListRatings();
    expect(stored).toHaveLength(1);

    const tombstone = stored[0];
    expect(tombstone.id).toBe('to-tombstone');
    expect(tombstone.rating).toBe(active.rating);
    expect(tombstone.efficiency).toBe(active.efficiency);
    expect(tombstone.mood).toBe(active.mood);
    expect(tombstone.activity).toBe(active.activity);
    expect(tombstone.reflection).toBe(active.reflection);
    expect(tombstone.slot_start).toBe(active.slot_start);
    expect(tombstone.slot_end).toBe(active.slot_end);
    expect(tombstone.created_at).toBe(active.created_at);
    expect(tombstone.deleted_at).toBe('2026-04-17T11:00:00.123Z');
    expect(tombstone.updated_at).toBe('2026-04-17T11:00:00.123Z');
    expect(tombstone.synced_at).toBeNull();
    expect(tombstone.schema_version).toBe(1);
  });

  it('excludes tombstoned records from list()', async () => {
    const active = makeRating('active');
    const toRemove = makeRating('to-remove');

    await repository.save(active);
    await repository.save(toRemove);
    await repository.remove('to-remove');

    const listed = await repository.list();
    expect(listed.map((rating) => rating.id)).toEqual(['active']);
  });

  it('returns null from get() for tombstoned records', async () => {
    const rating = makeRating('to-remove');
    await repository.save(rating);
    await repository.remove('to-remove');

    await expect(repository.get('to-remove')).resolves.toBeNull();
  });

  it('keeps tombstones in listPendingSync until they sync', async () => {
    const rating = makeRating('to-remove', { synced_at: '2026-04-17T10:00:00.000Z' });
    await repository.save(rating);

    await expect(repository.listPendingSync()).resolves.toEqual([]);

    await repository.remove('to-remove');

    const pending = await repository.listPendingSync();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      id: 'to-remove',
      synced_at: null,
    });
    expect(pending[0].deleted_at).not.toBeNull();
    expect(pending[0].deleted_at).not.toBeUndefined();
  });

  it('is a no-op when removing an already-tombstoned record', async () => {
    const rating = makeRating('to-remove');
    await repository.save(rating);

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-17T11:00:00.000Z'));
    await repository.remove('to-remove');

    const afterFirstRemove = await storageListRatings();
    expect(afterFirstRemove).toHaveLength(1);
    const firstTombstone = afterFirstRemove[0];

    jest.setSystemTime(new Date('2026-04-17T12:00:00.000Z'));
    await repository.remove('to-remove');

    const afterSecondRemove = await storageListRatings();
    expect(afterSecondRemove).toHaveLength(1);
    expect(afterSecondRemove[0]).toEqual(firstTombstone);
  });

  it('is a no-op when removing a record that does not exist', async () => {
    await expect(repository.remove('missing')).resolves.toBeUndefined();
    await expect(storageListRatings()).resolves.toEqual([]);
  });

  it('produces millisecond-precision ISO timestamps when writing a tombstone', async () => {
    const rating = makeRating('to-remove');
    await repository.save(rating);

    await repository.remove('to-remove');

    const stored = await storageListRatings();
    expect(stored).toHaveLength(1);
    expect(stored[0].deleted_at).toMatch(ISO_MS_PATTERN);
    expect(stored[0].updated_at).toMatch(ISO_MS_PATTERN);
    expect(stored[0].created_at).toMatch(ISO_MS_PATTERN);
  });
});
