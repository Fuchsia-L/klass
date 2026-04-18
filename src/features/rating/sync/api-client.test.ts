import {
  CloudRatingApiClient,
  DEFAULT_CLOUD_RATING_BASE_URL,
  SyncError,
  type FetchLike,
} from './api-client';
import type { TimeSlotRating } from '../types';

function makeRating(overrides: Partial<TimeSlotRating> = {}): TimeSlotRating {
  return {
    id: 'rating-1',
    slot_start: '2026-01-01T00:00:00.000Z',
    slot_end: '2026-01-01T01:00:00.000Z',
    rating: 4,
    efficiency: 3,
    created_at: '2026-01-01T01:00:00.000Z',
    updated_at: '2026-01-01T01:00:00.000Z',
    synced_at: null,
    schema_version: 1,
    ...overrides,
  };
}

type FetchMock = jest.Mock<ReturnType<FetchLike>, Parameters<FetchLike>>;

function makeJsonResponse(
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {},
) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  };
}

function makeFetchMock(response: ReturnType<typeof makeJsonResponse>): FetchMock {
  return jest.fn(() => Promise.resolve(response)) as unknown as FetchMock;
}

describe('CloudRatingApiClient.sync', () => {
  it('builds the correct URL, method, Authorization header, and JSON body', async () => {
    const fetchImpl = makeFetchMock(makeJsonResponse({}));
    const client = new CloudRatingApiClient({
      getToken: () => 'token-xyz',
      fetchImpl,
    });

    const records = [makeRating()];
    const since = '2026-01-10T00:00:00.000Z';

    await client.sync({ records, since });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${DEFAULT_CLOUD_RATING_BASE_URL}/v1/ratings/sync`);
    expect(init?.method).toBe('POST');
    expect(init?.headers?.Authorization).toBe('Bearer token-xyz');
    expect(init?.headers?.['Content-Type']).toBe('application/json');
    expect(JSON.parse(init?.body ?? '{}')).toEqual({ records, since });
  });

  it('uses an injected baseUrl when provided', async () => {
    const fetchImpl = makeFetchMock(makeJsonResponse({}));
    const client = new CloudRatingApiClient({
      getToken: () => 'token',
      baseUrl: 'https://staging.example.com/',
      fetchImpl,
    });

    await client.sync({ records: [] });

    expect(fetchImpl.mock.calls[0][0]).toBe('https://staging.example.com/v1/ratings/sync');
  });

  it('fetches the token on every request (not cached)', async () => {
    const fetchImpl = makeFetchMock(makeJsonResponse({}));
    const getToken = jest
      .fn()
      .mockResolvedValueOnce('first-token')
      .mockResolvedValueOnce('second-token');

    const client = new CloudRatingApiClient({ getToken, fetchImpl });

    await client.sync({ records: [] });
    await client.sync({ records: [] });

    expect(getToken).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][1]?.headers?.Authorization).toBe('Bearer first-token');
    expect(fetchImpl.mock.calls[1][1]?.headers?.Authorization).toBe('Bearer second-token');
  });

  it('scrubs expected_updated_at from outgoing records', async () => {
    const fetchImpl = makeFetchMock(makeJsonResponse({}));
    const client = new CloudRatingApiClient({ getToken: () => 'token', fetchImpl });

    const dirtyRecord = {
      ...makeRating(),
      expected_updated_at: '2025-12-31T00:00:00.000Z',
    };

    await client.sync({ records: [dirtyRecord] });

    const body = JSON.parse(fetchImpl.mock.calls[0][1]?.body ?? '{}');
    expect(body.records[0]).not.toHaveProperty('expected_updated_at');
    expect(body.records[0].id).toBe('rating-1');
  });

  it('returns partial-success errors[] to the caller on HTTP 200', async () => {
    const errorsPayload = [{ id: 'rating-1', error: 'conflict' }];
    const fetchImpl = makeFetchMock(
      makeJsonResponse({ records: [], errors: errorsPayload }, { ok: true, status: 200 }),
    );
    const client = new CloudRatingApiClient({ getToken: () => 'token', fetchImpl });

    const result = await client.sync({ records: [makeRating()] });

    expect(result.errors).toEqual(errorsPayload);
  });
});

describe('CloudRatingApiClient.list', () => {
  it('builds a GET to /v1/ratings with the since query param properly encoded', async () => {
    const fetchImpl = makeFetchMock(makeJsonResponse({ records: [] }));
    const client = new CloudRatingApiClient({ getToken: () => 'token', fetchImpl });

    const since = '2026-01-01T00:00:00.000Z';
    await client.list(since);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      `${DEFAULT_CLOUD_RATING_BASE_URL}/v1/ratings?since=${encodeURIComponent(since)}`,
    );
    expect(init?.method).toBe('GET');
    expect(init?.headers?.Authorization).toBe('Bearer token');
    expect(init?.body).toBeUndefined();
  });
});

describe('CloudRatingApiClient error mapping', () => {
  it('surfaces a missing token as a SyncError flagged isMissingToken', async () => {
    const fetchImpl = makeFetchMock(makeJsonResponse({}));
    const client = new CloudRatingApiClient({
      getToken: () => null,
      fetchImpl,
    });

    await expect(client.list('2026-01-01T00:00:00.000Z')).rejects.toMatchObject({
      name: 'SyncError',
      isMissingToken: true,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('treats an empty-string token as missing and does not call fetch', async () => {
    const fetchImpl = makeFetchMock(makeJsonResponse({}));
    const client = new CloudRatingApiClient({
      getToken: () => '',
      fetchImpl,
    });

    await expect(client.list('2026-01-01T00:00:00.000Z')).rejects.toMatchObject({
      name: 'SyncError',
      isMissingToken: true,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps a 401 response to a SyncError carrying statusCode=401', async () => {
    const fetchImpl = makeFetchMock(
      makeJsonResponse({ error: 'unauthorized' }, { ok: false, status: 401 }),
    );
    const client = new CloudRatingApiClient({ getToken: () => 'token', fetchImpl });

    const promise = client.sync({ records: [] });
    await expect(promise).rejects.toBeInstanceOf(SyncError);
    await expect(promise).rejects.toMatchObject({ statusCode: 401, isTimeout: false });
  });

  it('maps a 500 response to a SyncError carrying statusCode=500', async () => {
    const fetchImpl = makeFetchMock(
      makeJsonResponse({ error: 'server error' }, { ok: false, status: 500 }),
    );
    const client = new CloudRatingApiClient({ getToken: () => 'token', fetchImpl });

    const promise = client.list('2026-01-01T00:00:00.000Z');
    await expect(promise).rejects.toBeInstanceOf(SyncError);
    await expect(promise).rejects.toMatchObject({ statusCode: 500, isTimeout: false });
  });
});

describe('CloudRatingApiClient timeout behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects with a SyncError flagged isTimeout after 10s', async () => {
    const fetchImpl: FetchMock = jest.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('Aborted');
            (error as Error & { name: string }).name = 'AbortError';
            reject(error);
          });
        }),
    ) as unknown as FetchMock;

    const client = new CloudRatingApiClient({ getToken: () => 'token', fetchImpl });

    const pending = client.list('2026-01-01T00:00:00.000Z');
    // Attach a no-op catch to prevent unhandled-rejection warnings while we
    // advance timers. The main assertion still awaits the original promise.
    pending.catch(() => undefined);

    // Flush microtasks so the client reaches the `await fetchImpl(...)` point
    // and registers the abort listener before we advance fake timers.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(10_000);

    await expect(pending).rejects.toMatchObject({
      name: 'SyncError',
      isTimeout: true,
    });
  });
});
