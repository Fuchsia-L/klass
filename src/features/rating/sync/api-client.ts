import type { TimeSlotRating } from '../types';

export const DEFAULT_CLOUD_RATING_BASE_URL = 'https://api.epoch0.org';
export const DEFAULT_CLOUD_RATING_TIMEOUT_MS = 10_000;

export type SyncErrorOptions = {
  statusCode?: number;
  isTimeout?: boolean;
  isMissingToken?: boolean;
  body?: unknown;
  cause?: unknown;
};

export class SyncError extends Error {
  readonly statusCode?: number;
  readonly isTimeout: boolean;
  readonly isMissingToken: boolean;
  readonly body?: unknown;
  readonly cause?: unknown;

  constructor(message: string, options: SyncErrorOptions = {}) {
    super(message);
    this.name = 'SyncError';
    this.statusCode = options.statusCode;
    this.isTimeout = options.isTimeout === true;
    this.isMissingToken = options.isMissingToken === true;
    this.body = options.body;
    this.cause = options.cause;
  }
}

export type CloudRatingRecord = TimeSlotRating & { expected_updated_at?: string };

export type CloudRatingSyncRequest = {
  records: readonly CloudRatingRecord[];
  since?: string | null;
};

export type CloudRatingSyncErrorEntry = {
  id?: string;
  error?: string;
  [key: string]: unknown;
};

// Server contract: `/v1/ratings/sync` returns the accepted records under `records`.
// The scheduler (Phase 4) calls `markSynced(id, server_time)` for each entry here.
export type CloudRatingSyncResponse = {
  records?: TimeSlotRating[];
  errors?: CloudRatingSyncErrorEntry[];
  server_time?: string;
  [key: string]: unknown;
};

export type CloudRatingListResponse = {
  records?: TimeSlotRating[];
  server_time?: string;
  [key: string]: unknown;
};

export type TokenProvider = () => string | null | undefined | Promise<string | null | undefined>;

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

export type CloudRatingApiClientOptions = {
  getToken: TokenProvider;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
};

// Strips the client-only `expected_updated_at` hint before sending to the server.
// Top-level only by design: `CloudRatingRecord` is `TimeSlotRating & { expected_updated_at? }`,
// whose nested fields are primitives. If a caller later widens the input type,
// revisit whether deeper scrubbing is needed.
function scrubOutgoingRecord(record: CloudRatingRecord): TimeSlotRating {
  if ('expected_updated_at' in record) {
    const { expected_updated_at: _ignored, ...rest } = record;
    return rest;
  }
  return record;
}

async function parseJsonSafely(response: { json: () => Promise<unknown> }): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export class CloudRatingApiClient {
  private readonly getToken: TokenProvider;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: CloudRatingApiClientOptions) {
    if (typeof options?.getToken !== 'function') {
      throw new TypeError('CloudRatingApiClient requires a getToken callback');
    }

    this.getToken = options.getToken;
    this.baseUrl = (options.baseUrl ?? DEFAULT_CLOUD_RATING_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_CLOUD_RATING_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? ((globalThis as { fetch?: FetchLike }).fetch as FetchLike);

    if (typeof this.fetchImpl !== 'function') {
      throw new TypeError('CloudRatingApiClient requires a fetch implementation');
    }
  }

  async sync(request: CloudRatingSyncRequest): Promise<CloudRatingSyncResponse> {
    const records = (request.records ?? []).map(scrubOutgoingRecord);
    const body: { records: TimeSlotRating[]; since?: string | null } = { records };
    if (request.since !== undefined) {
      body.since = request.since;
    }

    return this.request<CloudRatingSyncResponse>({
      method: 'POST',
      path: '/v1/ratings/sync',
      body: JSON.stringify(body),
    });
  }

  async list(since: string): Promise<CloudRatingListResponse> {
    const query = `?since=${encodeURIComponent(since)}`;
    return this.request<CloudRatingListResponse>({
      method: 'GET',
      path: `/v1/ratings${query}`,
    });
  }

  private async request<T>({
    method,
    path,
    body,
  }: {
    method: 'GET' | 'POST';
    path: string;
    body?: string;
  }): Promise<T> {
    const token = await this.getToken();
    if (token == null || token === '') {
      throw new SyncError('Missing API token', { isMissingToken: true });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    const url = `${this.baseUrl}${path}`;

    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) {
        throw new SyncError('Request timed out', { isTimeout: true, cause: error });
      }
      throw new SyncError('Network request failed', { cause: error });
    } finally {
      clearTimeout(timer);
    }

    if (timedOut) {
      throw new SyncError('Request timed out', { isTimeout: true });
    }

    if (!response.ok) {
      const errorBody = await parseJsonSafely(response);
      throw new SyncError(`HTTP ${response.status}`, {
        statusCode: response.status,
        body: errorBody,
      });
    }

    const payload = (await parseJsonSafely(response)) as T;
    return (payload ?? ({} as T)) as T;
  }
}
