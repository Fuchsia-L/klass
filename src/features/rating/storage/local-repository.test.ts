import { TimeSlotRating } from '../types';
import { LocalRatingRepository } from './local-repository';
import { clearRatingsCache } from './ratings.storage';

function makeRating(id: string, synced_at?: string | null): TimeSlotRating {
  return {
    id,
    slot_start: '2026-04-17T08:00:00.000Z',
    slot_end: '2026-04-17T09:00:00.000Z',
    rating: 4,
    efficiency: 3,
    created_at: '2026-04-17T09:00:00.000Z',
    updated_at: '2026-04-17T09:00:00.000Z',
    synced_at,
    schema_version: 1,
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
    const unsyncedNull = makeRating('unsynced-null', null);
    const synced = makeRating('synced', '2026-04-17T10:00:00.000Z');

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
});
