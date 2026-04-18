import type { TimeSlotRating } from '../types';
import type { RatingRepository } from '../storage/repository';
import { SyncingRatingRepository, type SyncScheduler } from './syncing-repository';

function makeRating(overrides: Partial<TimeSlotRating> = {}): TimeSlotRating {
  return {
    id: 'rating-1',
    slot_start: '2026-04-17T08:00:00.000Z',
    slot_end: '2026-04-17T09:00:00.000Z',
    rating: 4,
    efficiency: 3,
    created_at: '2026-04-17T09:00:00.000Z',
    updated_at: '2026-04-17T09:00:00.000Z',
    synced_at: null,
    schema_version: 1,
    ...overrides,
  };
}

function createMockLocal(): jest.Mocked<RatingRepository> {
  return {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    listPendingSync: jest.fn().mockResolvedValue([]),
    markSynced: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockReturnValue(() => {}),
  };
}

function createMockScheduler(): jest.Mocked<SyncScheduler> {
  return {
    notifyLocalChange: jest.fn(),
  };
}

describe('SyncingRatingRepository', () => {
  it('forwards save to local and then calls scheduler.notifyLocalChange exactly once', async () => {
    const local = createMockLocal();
    const scheduler = createMockScheduler();
    const repo = new SyncingRatingRepository(local, scheduler);
    const rating = makeRating();

    const callOrder: string[] = [];
    local.save.mockImplementation(async () => {
      callOrder.push('local.save');
    });
    scheduler.notifyLocalChange.mockImplementation(() => {
      callOrder.push('scheduler.notifyLocalChange');
    });

    await repo.save(rating);

    expect(local.save).toHaveBeenCalledTimes(1);
    expect(local.save).toHaveBeenCalledWith(rating);
    expect(scheduler.notifyLocalChange).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['local.save', 'scheduler.notifyLocalChange']);
  });

  it('forwards remove to local and then calls scheduler.notifyLocalChange exactly once', async () => {
    const local = createMockLocal();
    const scheduler = createMockScheduler();
    const repo = new SyncingRatingRepository(local, scheduler);

    const callOrder: string[] = [];
    local.remove.mockImplementation(async () => {
      callOrder.push('local.remove');
    });
    scheduler.notifyLocalChange.mockImplementation(() => {
      callOrder.push('scheduler.notifyLocalChange');
    });

    await repo.remove('rating-1');

    expect(local.remove).toHaveBeenCalledTimes(1);
    expect(local.remove).toHaveBeenCalledWith('rating-1');
    expect(scheduler.notifyLocalChange).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['local.remove', 'scheduler.notifyLocalChange']);
  });

  it('list passes through to local without notifying the scheduler', async () => {
    const local = createMockLocal();
    const scheduler = createMockScheduler();
    const repo = new SyncingRatingRepository(local, scheduler);
    const ratings = [makeRating({ id: 'a' }), makeRating({ id: 'b' })];
    local.list.mockResolvedValue(ratings);

    await expect(repo.list()).resolves.toBe(ratings);

    expect(local.list).toHaveBeenCalledTimes(1);
    expect(scheduler.notifyLocalChange).not.toHaveBeenCalled();
  });

  it('get returns null when local.get returns null (tombstoned)', async () => {
    const local = createMockLocal();
    const scheduler = createMockScheduler();
    const repo = new SyncingRatingRepository(local, scheduler);
    local.get.mockResolvedValue(null);

    await expect(repo.get('tombstoned')).resolves.toBeNull();

    expect(local.get).toHaveBeenCalledTimes(1);
    expect(local.get).toHaveBeenCalledWith('tombstoned');
    expect(scheduler.notifyLocalChange).not.toHaveBeenCalled();
  });

  it('get passes through the record when local.get resolves with one', async () => {
    const local = createMockLocal();
    const scheduler = createMockScheduler();
    const repo = new SyncingRatingRepository(local, scheduler);
    const rating = makeRating();
    local.get.mockResolvedValue(rating);

    await expect(repo.get('rating-1')).resolves.toBe(rating);
    expect(scheduler.notifyLocalChange).not.toHaveBeenCalled();
  });

  it('listPendingSync passes through to local without notifying the scheduler', async () => {
    const local = createMockLocal();
    const scheduler = createMockScheduler();
    const repo = new SyncingRatingRepository(local, scheduler);
    const pending = [makeRating({ id: 'p' })];
    local.listPendingSync.mockResolvedValue(pending);

    await expect(repo.listPendingSync()).resolves.toBe(pending);

    expect(local.listPendingSync).toHaveBeenCalledTimes(1);
    expect(scheduler.notifyLocalChange).not.toHaveBeenCalled();
  });

  it('markSynced delegates to local with the same arguments and does not notify the scheduler', async () => {
    const local = createMockLocal();
    const scheduler = createMockScheduler();
    const repo = new SyncingRatingRepository(local, scheduler);

    await repo.markSynced('rating-1', '2026-04-17T10:00:00.000Z');

    expect(local.markSynced).toHaveBeenCalledTimes(1);
    expect(local.markSynced).toHaveBeenCalledWith('rating-1', '2026-04-17T10:00:00.000Z');
    expect(scheduler.notifyLocalChange).not.toHaveBeenCalled();
  });

  it('does not perform any network or fetch calls', async () => {
    const fetchSpy = jest.fn();
    const originalFetch = (globalThis as { fetch?: unknown }).fetch;
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    try {
      const local = createMockLocal();
      const scheduler = createMockScheduler();
      const repo = new SyncingRatingRepository(local, scheduler);

      await repo.save(makeRating());
      await repo.remove('rating-1');
      await repo.list();
      await repo.get('rating-1');
      await repo.listPendingSync();
      await repo.markSynced('rating-1', '2026-04-17T10:00:00.000Z');

      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      (globalThis as { fetch?: unknown }).fetch = originalFetch;
    }
  });

  it('forwards subscribe to local.subscribe when available', () => {
    const local = createMockLocal();
    const scheduler = createMockScheduler();
    const unsubscribe = jest.fn();
    local.subscribe!.mockReturnValue(unsubscribe);
    const repo = new SyncingRatingRepository(local, scheduler);

    const listener = jest.fn();
    const teardown = repo.subscribe(listener);

    expect(local.subscribe).toHaveBeenCalledWith(listener);
    teardown();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('returns a no-op unsubscribe when local has no subscribe method', () => {
    const local: RatingRepository = {
      list: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      listPendingSync: jest.fn().mockResolvedValue([]),
      markSynced: jest.fn().mockResolvedValue(undefined),
    };
    const scheduler = createMockScheduler();
    const repo = new SyncingRatingRepository(local, scheduler);

    expect(() => repo.subscribe(() => {})()).not.toThrow();
  });
});
