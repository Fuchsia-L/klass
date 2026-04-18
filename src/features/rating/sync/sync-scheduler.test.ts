import type { RatingRepository } from '../storage/repository';
import type { TimeSlotRating } from '../types';
import {
  SyncError,
  type CloudRatingListResponse,
  type CloudRatingSyncRequest,
  type CloudRatingSyncResponse,
} from './api-client';
import {
  SyncScheduler,
  getSyncScheduler,
  resetSyncSchedulerForTests,
  type SyncApiClient,
  type SyncSchedulerStatus,
} from './sync-scheduler';

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
    created_at: '2026-04-17T09:00:00.000Z',
    updated_at: '2026-04-17T09:00:00.000Z',
    synced_at: null,
    schema_version: 1,
    ...overrides,
  };
}

class FakeLocalRepository implements RatingRepository {
  records = new Map<string, TimeSlotRating>();
  private readonly listeners = new Set<() => void>();

  async list(): Promise<TimeSlotRating[]> {
    return Array.from(this.records.values()).filter((r) => r.deleted_at == null);
  }

  async listAll(): Promise<TimeSlotRating[]> {
    return Array.from(this.records.values()).map((r) => ({ ...r }));
  }

  async get(id: string): Promise<TimeSlotRating | null> {
    const r = this.records.get(id);
    if (!r || r.deleted_at != null) return null;
    return { ...r };
  }

  async save(rating: TimeSlotRating): Promise<void> {
    this.records.set(rating.id, { ...rating });
    this.listeners.forEach((l) => l());
  }

  async remove(id: string): Promise<void> {
    const r = this.records.get(id);
    if (!r || r.deleted_at != null) return;
    const now = new Date().toISOString();
    this.records.set(id, {
      ...r,
      deleted_at: now,
      updated_at: now,
      synced_at: null,
    });
    this.listeners.forEach((l) => l());
  }

  async listPendingSync(): Promise<TimeSlotRating[]> {
    return Array.from(this.records.values())
      .filter((r) => r.synced_at == null)
      .map((r) => ({ ...r }));
  }

  async markSynced(id: string, syncedAt: string): Promise<void> {
    const r = this.records.get(id);
    if (!r) return;
    this.records.set(id, { ...r, synced_at: syncedAt });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

function emptyResponse(serverTime = '2026-04-17T10:00:00.000Z'): CloudRatingSyncResponse {
  return { records: [], errors: [], server_time: serverTime };
}

function makeApiClient(
  syncImpl: (request: CloudRatingSyncRequest) => Promise<CloudRatingSyncResponse>,
  listImpl?: (since: string) => Promise<CloudRatingListResponse>,
): SyncApiClient {
  return {
    sync: jest.fn(syncImpl),
    list: jest.fn(listImpl ?? (async () => ({ records: [] }))),
  };
}

describe('getSyncScheduler singleton', () => {
  afterEach(() => {
    resetSyncSchedulerForTests();
  });

  it('returns the same instance across calls', () => {
    const repository = new FakeLocalRepository();
    const apiClient = makeApiClient(async () => emptyResponse());

    const first = getSyncScheduler({ repository, apiClient });
    const second = getSyncScheduler();

    expect(second).toBe(first);
  });

  it('ignores options after the first initialization', () => {
    const repository = new FakeLocalRepository();
    const apiClient = makeApiClient(async () => emptyResponse());
    const first = getSyncScheduler({ repository, apiClient });

    const otherRepo = new FakeLocalRepository();
    const second = getSyncScheduler({ repository: otherRepo, apiClient });
    expect(second).toBe(first);
  });
});

describe('SyncScheduler lifecycle', () => {
  it('start is a no-op when already started', () => {
    const repository = new FakeLocalRepository();
    const apiClient = makeApiClient(async () => emptyResponse());
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();
    expect(() => scheduler.start()).not.toThrow();
  });

  it('stop clears debounce timers, retry timers, and retry state', async () => {
    jest.useFakeTimers();
    try {
      const repository = new FakeLocalRepository();
      const syncMock = jest
        .fn<Promise<CloudRatingSyncResponse>, [CloudRatingSyncRequest]>()
        .mockRejectedValue(new SyncError('boom'));
      const apiClient = makeApiClient(syncMock);
      const scheduler = new SyncScheduler({ repository, apiClient });
      scheduler.start();

      scheduler.notifyLocalChange();
      scheduler.stop();
      await jest.advanceTimersByTimeAsync(10_000);

      expect(syncMock).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('stop cancels an already-scheduled retry timer', async () => {
    jest.useFakeTimers();
    try {
      const repository = new FakeLocalRepository();
      const syncMock = jest
        .fn<Promise<CloudRatingSyncResponse>, [CloudRatingSyncRequest]>()
        .mockRejectedValue(new SyncError('boom'));
      const apiClient = makeApiClient(syncMock);
      const scheduler = new SyncScheduler({ repository, apiClient });
      scheduler.start();

      // First sync attempt fails → retry timer armed (5s).
      await scheduler.pullNow();
      expect(syncMock).toHaveBeenCalledTimes(1);

      scheduler.stop();

      // Advance well past every retry-schedule tier. No further sync should fire.
      await jest.advanceTimersByTimeAsync(600_000);
      expect(syncMock).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('SyncScheduler debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('collapses rapid notifyLocalChange calls into a single doSync after 5s', async () => {
    const repository = new FakeLocalRepository();
    const syncMock = jest
      .fn<Promise<CloudRatingSyncResponse>, [CloudRatingSyncRequest]>()
      .mockResolvedValue(emptyResponse());
    const apiClient = makeApiClient(syncMock);
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    scheduler.notifyLocalChange();
    scheduler.notifyLocalChange();
    scheduler.notifyLocalChange();

    await jest.advanceTimersByTimeAsync(4_999);
    expect(syncMock).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(syncMock).toHaveBeenCalledTimes(1);
  });

  it('pullNow bypasses the debounce and fires doSync immediately', async () => {
    const repository = new FakeLocalRepository();
    const syncMock = jest
      .fn<Promise<CloudRatingSyncResponse>, [CloudRatingSyncRequest]>()
      .mockResolvedValue(emptyResponse());
    const apiClient = makeApiClient(syncMock);
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    // No timer advance needed; pullNow must run doSync in this tick.
    const pending = scheduler.pullNow();
    await pending;
    expect(syncMock).toHaveBeenCalledTimes(1);
  });
});

describe('SyncScheduler doSync success', () => {
  it('emits syncing → idle with server_time and marks each pushed record as synced', async () => {
    const repository = new FakeLocalRepository();
    const ratingA = makeRating('a', { updated_at: '2026-04-17T09:00:00.000Z' });
    const ratingB = makeRating('b', { updated_at: '2026-04-17T09:05:00.000Z' });
    repository.records.set(ratingA.id, ratingA);
    repository.records.set(ratingB.id, ratingB);

    const serverTime = '2026-04-17T10:00:00.123Z';
    const syncMock = jest
      .fn<Promise<CloudRatingSyncResponse>, [CloudRatingSyncRequest]>()
      .mockResolvedValue({ records: [], errors: [], server_time: serverTime });
    const apiClient = makeApiClient(syncMock);
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    const statuses: SyncSchedulerStatus[] = [];
    scheduler.onStatusChange((s) => statuses.push(s));

    await scheduler.pullNow();

    expect(statuses[0]).toEqual({ kind: 'syncing', lastSyncAt: null });
    expect(statuses[statuses.length - 1]).toEqual({
      kind: 'idle',
      lastSyncAt: serverTime,
    });

    expect(repository.records.get('a')?.synced_at).toBe(serverTime);
    expect(repository.records.get('b')?.synced_at).toBe(serverTime);
  });

  it('computes since as the max local updated_at', async () => {
    const repository = new FakeLocalRepository();
    repository.records.set(
      'a',
      makeRating('a', { updated_at: '2026-04-17T09:00:00.000Z' }),
    );
    repository.records.set(
      'b',
      makeRating('b', {
        updated_at: '2026-04-17T09:30:00.500Z',
        synced_at: '2026-04-17T09:31:00.000Z',
      }),
    );

    const syncMock = jest
      .fn<Promise<CloudRatingSyncResponse>, [CloudRatingSyncRequest]>()
      .mockResolvedValue(emptyResponse());
    const apiClient = makeApiClient(syncMock);
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    await scheduler.pullNow();

    expect(syncMock).toHaveBeenCalledTimes(1);
    expect(syncMock.mock.calls[0][0].since).toBe('2026-04-17T09:30:00.500Z');
  });
});

describe('SyncScheduler LWW merge', () => {
  it('does not overwrite a local record whose updated_at is newer than the remote', async () => {
    const repository = new FakeLocalRepository();
    const localNewer = makeRating('r1', {
      rating: 5,
      updated_at: '2026-04-17T10:00:00.000Z',
      synced_at: '2026-04-17T09:00:00.000Z',
    });
    repository.records.set(localNewer.id, localNewer);

    const olderRemote = makeRating('r1', {
      rating: 2,
      updated_at: '2026-04-17T08:00:00.000Z',
    });
    const apiClient = makeApiClient(async () => ({
      records: [olderRemote],
      errors: [],
      server_time: '2026-04-17T11:00:00.000Z',
    }));
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    await scheduler.pullNow();

    expect(repository.records.get('r1')).toMatchObject({
      rating: 5,
      updated_at: '2026-04-17T10:00:00.000Z',
    });
  });

  it('overwrites local when the remote updated_at is newer', async () => {
    const repository = new FakeLocalRepository();
    const localOlder = makeRating('r1', {
      rating: 2,
      updated_at: '2026-04-17T08:00:00.000Z',
      synced_at: '2026-04-17T08:01:00.000Z',
    });
    repository.records.set(localOlder.id, localOlder);

    const newerRemote = makeRating('r1', {
      rating: 5,
      updated_at: '2026-04-17T10:00:00.000Z',
    });
    const apiClient = makeApiClient(async () => ({
      records: [newerRemote],
      errors: [],
      server_time: '2026-04-17T11:00:00.000Z',
    }));
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    await scheduler.pullNow();

    expect(repository.records.get('r1')).toMatchObject({
      rating: 5,
      updated_at: '2026-04-17T10:00:00.000Z',
    });
  });

  it('upserts tombstones from the server and hides them from list()', async () => {
    const repository = new FakeLocalRepository();
    const tombstone = makeRating('t1', {
      deleted_at: '2026-04-17T10:00:00.000Z',
      updated_at: '2026-04-17T10:00:00.000Z',
    });
    const apiClient = makeApiClient(async () => ({
      records: [tombstone],
      errors: [],
      server_time: '2026-04-17T11:00:00.000Z',
    }));
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    await scheduler.pullNow();

    expect(repository.records.get('t1')?.deleted_at).toBe('2026-04-17T10:00:00.000Z');
    await expect(repository.list()).resolves.toEqual([]);
  });
});

describe('SyncScheduler retry / backoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules retries at 5s, 30s, 2m, 5m, 5m on repeated network errors', async () => {
    const repository = new FakeLocalRepository();
    const syncMock = jest
      .fn<Promise<CloudRatingSyncResponse>, [CloudRatingSyncRequest]>()
      .mockRejectedValue(new SyncError('network down', { cause: new Error('ECONN') }));
    const apiClient = makeApiClient(syncMock);
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    scheduler.notifyLocalChange();

    // Initial debounce completes → first sync attempt (fails)
    await jest.advanceTimersByTimeAsync(5_000);
    expect(syncMock).toHaveBeenCalledTimes(1);

    // Retry 1 after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    expect(syncMock).toHaveBeenCalledTimes(2);

    // Retry 2 after 30s
    await jest.advanceTimersByTimeAsync(30_000);
    expect(syncMock).toHaveBeenCalledTimes(3);

    // Retry 3 after 2m
    await jest.advanceTimersByTimeAsync(120_000);
    expect(syncMock).toHaveBeenCalledTimes(4);

    // Retry 4 after 5m
    await jest.advanceTimersByTimeAsync(300_000);
    expect(syncMock).toHaveBeenCalledTimes(5);

    // Retry 5 capped at 5m
    await jest.advanceTimersByTimeAsync(300_000);
    expect(syncMock).toHaveBeenCalledTimes(6);
  });

  it('emits token-invalid error and schedules no retry on 401', async () => {
    const repository = new FakeLocalRepository();
    const syncMock = jest
      .fn<Promise<CloudRatingSyncResponse>, [CloudRatingSyncRequest]>()
      .mockRejectedValue(new SyncError('unauthorized', { statusCode: 401 }));
    const apiClient = makeApiClient(syncMock);
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    const statuses: SyncSchedulerStatus[] = [];
    scheduler.onStatusChange((s) => statuses.push(s));

    await scheduler.pullNow();

    const errorStatus = statuses.find((s) => s.kind === 'error');
    expect(errorStatus).toMatchObject({
      kind: 'error',
      message: 'token 无效',
      lastSyncAt: null,
    });

    await jest.advanceTimersByTimeAsync(600_000);
    expect(syncMock).toHaveBeenCalledTimes(1);
  });

  it('cancels pending retry and restarts 5s debounce on notifyLocalChange during backoff', async () => {
    const repository = new FakeLocalRepository();
    const syncMock = jest
      .fn<Promise<CloudRatingSyncResponse>, [CloudRatingSyncRequest]>()
      .mockRejectedValueOnce(new SyncError('network'))
      .mockResolvedValue(emptyResponse());
    const apiClient = makeApiClient(syncMock);
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    scheduler.notifyLocalChange();

    // Initial debounce → first sync fails → retry scheduled (5s)
    await jest.advanceTimersByTimeAsync(5_000);
    expect(syncMock).toHaveBeenCalledTimes(1);

    // 2s into backoff, a new local change arrives
    await jest.advanceTimersByTimeAsync(2_000);
    scheduler.notifyLocalChange();

    // Backoff should have been canceled: advancing past the original retry
    // window must not trigger the retry.
    await jest.advanceTimersByTimeAsync(3_100);
    expect(syncMock).toHaveBeenCalledTimes(1);

    // New 5s debounce fires (total 5s from the notifyLocalChange)
    await jest.advanceTimersByTimeAsync(1_900);
    expect(syncMock).toHaveBeenCalledTimes(2);

    // Backoff reset: after success, no further retry
    await jest.advanceTimersByTimeAsync(300_000);
    expect(syncMock).toHaveBeenCalledTimes(2);
  });

  it('formats retry countdowns in the error message', async () => {
    const repository = new FakeLocalRepository();
    const syncMock = jest
      .fn<Promise<CloudRatingSyncResponse>, [CloudRatingSyncRequest]>()
      .mockRejectedValueOnce(new SyncError('network'))
      .mockRejectedValueOnce(new SyncError('5xx', { statusCode: 500 }))
      .mockRejectedValueOnce(new SyncError('timed out', { isTimeout: true }));
    const apiClient = makeApiClient(syncMock);
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    const statuses: SyncSchedulerStatus[] = [];
    scheduler.onStatusChange((s) => statuses.push(s));

    scheduler.notifyLocalChange();
    await jest.advanceTimersByTimeAsync(5_000);
    await jest.advanceTimersByTimeAsync(5_000);
    await jest.advanceTimersByTimeAsync(30_000);

    const errors = statuses.filter((s): s is Extract<SyncSchedulerStatus, { kind: 'error' }> =>
      s.kind === 'error',
    );
    expect(errors[0].message).toBe('网络异常 · 5s 后重试');
    expect(errors[1].message).toBe('服务端异常 · 30s 后重试');
    expect(errors[2].message).toBe('超时 · 120s 后重试');
  });
});

describe('SyncScheduler partial rejections', () => {
  it('logs per-record errors but stays in idle and skips markSynced for rejected ids', async () => {
    const repository = new FakeLocalRepository();
    const ratingA = makeRating('a');
    const ratingB = makeRating('b');
    repository.records.set(ratingA.id, ratingA);
    repository.records.set(ratingB.id, ratingB);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const syncMock = jest
        .fn<Promise<CloudRatingSyncResponse>, [CloudRatingSyncRequest]>()
        .mockResolvedValue({
          records: [],
          errors: [{ id: 'a', error: 'stale' }],
          server_time: '2026-04-17T10:00:00.000Z',
        });
      const apiClient = makeApiClient(syncMock);
      const scheduler = new SyncScheduler({ repository, apiClient });
      scheduler.start();

      const statuses: SyncSchedulerStatus[] = [];
      scheduler.onStatusChange((s) => statuses.push(s));

      await scheduler.pullNow();

      const terminal = statuses[statuses.length - 1];
      expect(terminal.kind).toBe('idle');
      expect(repository.records.get('a')?.synced_at).toBeNull();
      expect(repository.records.get('b')?.synced_at).toBe('2026-04-17T10:00:00.000Z');
      expect(warnSpy).toHaveBeenCalled();
      expect(syncMock).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('SyncScheduler onStatusChange subscription', () => {
  it('fires listeners on change and stops after unsubscribe', async () => {
    const repository = new FakeLocalRepository();
    const apiClient = makeApiClient(async () => emptyResponse());
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    const listener = jest.fn();
    const unsubscribe = scheduler.onStatusChange(listener);

    await scheduler.pullNow();
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2);

    listener.mockClear();
    unsubscribe();
    await scheduler.pullNow();
    expect(listener).not.toHaveBeenCalled();
  });

  it('getStatus reflects the latest transition', async () => {
    const repository = new FakeLocalRepository();
    const apiClient = makeApiClient(async () => ({
      records: [],
      errors: [],
      server_time: '2026-04-17T10:00:00.000Z',
    }));
    const scheduler = new SyncScheduler({ repository, apiClient });
    scheduler.start();

    await scheduler.pullNow();

    expect(scheduler.getStatus()).toEqual({
      kind: 'idle',
      lastSyncAt: '2026-04-17T10:00:00.000Z',
    });
  });
});
