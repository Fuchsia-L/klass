import type { RatingRepository } from '../storage/repository';
import type { TimeSlotRating } from '../types';
import {
  SyncError,
  type CloudRatingListResponse,
  type CloudRatingSyncRequest,
  type CloudRatingSyncResponse,
} from './api-client';
import type { SyncScheduler as SyncSchedulerContract } from './syncing-repository';

export interface SyncApiClient {
  sync(request: CloudRatingSyncRequest): Promise<CloudRatingSyncResponse>;
  list(since: string): Promise<CloudRatingListResponse>;
}

export type SyncSchedulerStatus =
  | { kind: 'idle'; lastSyncAt: string | null }
  | { kind: 'syncing'; lastSyncAt: string | null }
  | { kind: 'error'; message: string; lastSyncAt: string | null }
  | { kind: 'unconfigured' };

export type SyncSchedulerStatusListener = (status: SyncSchedulerStatus) => void;

export interface SyncSchedulerOptions {
  // Must be the unwrapped local repository (e.g. `localRatingRepository`).
  // Passing a SyncingRatingRepository would make the scheduler's own merge-
  // phase writes re-enter `notifyLocalChange()` → debounce → another sync.
  repository: RatingRepository;
  apiClient: SyncApiClient;
  initialStatus?: SyncSchedulerStatus;
}

const DEBOUNCE_MS = 5_000;
const BACKOFF_SCHEDULE_MS = [5_000, 30_000, 120_000, 300_000];

const TOKEN_INVALID_MESSAGE = 'token 无效';

export class SyncScheduler implements SyncSchedulerContract {
  private readonly repository: RatingRepository;
  private readonly apiClient: SyncApiClient;
  private status: SyncSchedulerStatus;
  private readonly listeners = new Set<SyncSchedulerStatusListener>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private started = false;
  private syncing = false;
  private pendingRun = false;

  constructor(options: SyncSchedulerOptions) {
    this.repository = options.repository;
    this.apiClient = options.apiClient;
    this.status = options.initialStatus ?? { kind: 'idle', lastSyncAt: null };
  }

  start(): void {
    this.started = true;
    // A caller writing a fresh token after a 401/403 expects start() to
    // re-arm the scheduler. Kick off a sync so they don't have to also
    // call pullNow() — whether or not a prior stop() cleared `started`.
    if (
      this.status.kind === 'error' &&
      this.status.message === TOKEN_INVALID_MESSAGE
    ) {
      void this.runSync();
    }
  }

  stop(): void {
    this.started = false;
    this.clearDebounce();
    this.clearRetry();
    this.retryAttempt = 0;
    this.pendingRun = false;
  }

  notifyLocalChange(): void {
    if (!this.started) return;
    // A local change during backoff resets backoff and restarts the 5s debounce.
    this.clearRetry();
    this.retryAttempt = 0;
    if (this.debounceTimer != null) return;
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.runSync();
    }, DEBOUNCE_MS);
  }

  async pullNow(): Promise<void> {
    if (!this.started) return;
    this.clearDebounce();
    this.clearRetry();
    await this.runSync();
  }

  getStatus(): SyncSchedulerStatus {
    return this.status;
  }

  onStatusChange(listener: SyncSchedulerStatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setStatus(next: SyncSchedulerStatus): void {
    this.status = next;
    this.listeners.forEach((listener) => listener(next));
  }

  private getLastSyncAt(): string | null {
    if (this.status.kind === 'unconfigured') return null;
    return this.status.lastSyncAt;
  }

  private async runSync(): Promise<void> {
    if (this.syncing) {
      // A local change (or pullNow) arrived mid-sync. Remember it so we
      // re-run once the in-flight sync completes — otherwise the change
      // would sit un-synced until the next local change arrives.
      this.pendingRun = true;
      return;
    }
    this.syncing = true;
    const prevLastSyncAt = this.getLastSyncAt();
    this.setStatus({ kind: 'syncing', lastSyncAt: prevLastSyncAt });

    try {
      const response = await this.doSync();
      this.retryAttempt = 0;
      const lastSyncAt = response.server_time ?? prevLastSyncAt;
      this.setStatus({ kind: 'idle', lastSyncAt });
    } catch (error) {
      this.handleSyncError(error, prevLastSyncAt);
    } finally {
      this.syncing = false;
      if (this.pendingRun && this.started) {
        this.pendingRun = false;
        // Treat the queued run like a fresh local change: drop any pending
        // retry and reset backoff so we sync now.
        this.clearRetry();
        this.retryAttempt = 0;
        void this.runSync();
      }
    }
  }

  private async doSync(): Promise<CloudRatingSyncResponse> {
    const pending = await this.repository.listPendingSync();
    const since = await this.computeSince();

    const response = await this.apiClient.sync({
      records: pending,
      since,
    });

    const serverTime = response.server_time ?? new Date().toISOString();
    await this.mergeRemoteRecords(response.records ?? [], serverTime);

    const rejected = new Set(
      (response.errors ?? [])
        .map((entry) => entry.id)
        .filter((id): id is string => typeof id === 'string'),
    );
    for (const pushed of pending) {
      if (rejected.has(pushed.id)) continue;
      await this.repository.markSynced(pushed.id, serverTime);
    }

    if ((response.errors ?? []).length > 0) {
      console.warn('Cloud sync reported per-record errors', response.errors);
    }

    return response;
  }

  private async computeSince(): Promise<string | null> {
    // Use listAll so synced tombstones contribute to the cursor; otherwise
    // the server re-sends them every cycle.
    const all = await this.repository.listAll();
    let max: string | null = null;
    for (const rating of all) {
      if (max === null || rating.updated_at > max) max = rating.updated_at;
    }
    return max;
  }

  private async mergeRemoteRecords(
    remotes: readonly TimeSlotRating[],
    serverTime: string,
  ): Promise<void> {
    if (remotes.length === 0) return;
    // listAll includes tombstones, so a newer local delete won't be blindly
    // overwritten by an older remote (which would happen with get() because
    // get filters tombstones out).
    const all = await this.repository.listAll();
    const localById = new Map(all.map((rating) => [rating.id, rating]));
    for (const remote of remotes) {
      const local = localById.get(remote.id);
      if (local && local.updated_at >= remote.updated_at) continue;
      // Stamp synced_at in the same save so we don't pay a second AsyncStorage
      // round-trip (and fire a second listener) just to mark a server-canonical
      // row as synced.
      await this.repository.save({ ...remote, synced_at: serverTime });
    }
  }

  private handleSyncError(error: unknown, prevLastSyncAt: string | null): void {
    if (error instanceof SyncError) {
      if (error.isMissingToken || error.statusCode === 401 || error.statusCode === 403) {
        this.clearRetry();
        this.retryAttempt = 0;
        this.setStatus({
          kind: 'error',
          message: TOKEN_INVALID_MESSAGE,
          lastSyncAt: prevLastSyncAt,
        });
        return;
      }

      const delay = this.delayForAttempt(this.retryAttempt);
      this.retryAttempt += 1;
      this.setStatus({
        kind: 'error',
        message: this.formatRetryMessage(error, delay),
        lastSyncAt: prevLastSyncAt,
      });
      this.scheduleRetry(delay);
      return;
    }

    const delay = this.delayForAttempt(this.retryAttempt);
    this.retryAttempt += 1;
    const seconds = Math.round(delay / 1000);
    this.setStatus({
      kind: 'error',
      message: `网络异常 · ${seconds}s 后重试`,
      lastSyncAt: prevLastSyncAt,
    });
    this.scheduleRetry(delay);
  }

  private formatRetryMessage(error: SyncError, delayMs: number): string {
    const seconds = Math.round(delayMs / 1000);
    if (error.isTimeout) return `超时 · ${seconds}s 后重试`;
    if (error.statusCode && error.statusCode >= 500) {
      return `服务端异常 · ${seconds}s 后重试`;
    }
    return `网络异常 · ${seconds}s 后重试`;
  }

  private delayForAttempt(attempt: number): number {
    const idx = Math.min(attempt, BACKOFF_SCHEDULE_MS.length - 1);
    return BACKOFF_SCHEDULE_MS[idx];
  }

  private scheduleRetry(delayMs: number): void {
    if (!this.started) return;
    this.clearRetry();
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.runSync();
    }, delayMs);
  }

  private clearDebounce(): void {
    if (this.debounceTimer != null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private clearRetry(): void {
    if (this.retryTimer != null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}

let schedulerSingleton: SyncScheduler | null = null;

export function getSyncScheduler(options?: SyncSchedulerOptions): SyncScheduler {
  if (schedulerSingleton == null) {
    if (!options) {
      throw new Error('getSyncScheduler must be initialized with options on first call');
    }
    schedulerSingleton = new SyncScheduler(options);
  }
  return schedulerSingleton;
}

export function resetSyncSchedulerForTests(): void {
  if (schedulerSingleton) {
    schedulerSingleton.stop();
  }
  schedulerSingleton = null;
}
