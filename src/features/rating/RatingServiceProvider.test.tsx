import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { RatingServiceProvider, useRatingService } from './RatingServiceProvider';
import { clearRatingsCache } from './storage';
import {
  SYNC_TOKEN_STORAGE_KEY,
  resetSyncSchedulerForTests,
} from './sync';
import { createRating, getRatingsService, listRatings, removeRating } from './services';
import { CloudRatingApiClient } from './sync/api-client';

type AppStateSubscription = { remove: () => void };
type AppStateListener = (state: string) => void;

function captureAppStateListener() {
  const removeSpy = jest.fn();
  let capturedListener: AppStateListener | null = null;

  const spy = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation(((event: string, listener: AppStateListener) => {
      if (event === 'change') {
        capturedListener = listener;
      }
      return { remove: removeSpy } as AppStateSubscription;
    }) as unknown as typeof AppState.addEventListener);

  return {
    spy,
    removeSpy,
    getListener: () => capturedListener,
  };
}

describe('RatingServiceProvider', () => {
  beforeEach(() => {
    resetSyncSchedulerForTests();
    clearRatingsCache();
  });

  afterEach(() => {
    resetSyncSchedulerForTests();
    clearRatingsCache();
    jest.restoreAllMocks();
  });

  it('wires SyncingRatingRepository so saves through the service notify the scheduler', async () => {
    const appState = captureAppStateListener();

    const { unmount } = render(
      <RatingServiceProvider>
        <></>
      </RatingServiceProvider>,
    );

    const service = getRatingsService();
    // Mutations notify the scheduler via the wrapper; spy on the singleton
    // owned by the provider.
    const scheduler = require('./sync/sync-scheduler').getSyncScheduler();
    const notifySpy = jest.spyOn(scheduler, 'notifyLocalChange');

    await act(async () => {
      await service.createRating({ rating: 4, efficiency: 5 });
    });

    expect(notifySpy).toHaveBeenCalledTimes(1);

    const [saved] = await listRatings();
    await act(async () => {
      await removeRating(saved.id);
    });

    expect(notifySpy).toHaveBeenCalledTimes(2);

    unmount();
    appState.spy.mockRestore();
  });

  it('calls scheduler.start exactly once on boot when a token is stored', async () => {
    await AsyncStorage.setItem(SYNC_TOKEN_STORAGE_KEY, 'abc123');
    const appState = captureAppStateListener();

    const schedulerModule = require('./sync/sync-scheduler');
    const startSpy = jest.spyOn(schedulerModule.SyncScheduler.prototype, 'start');

    const { unmount } = render(
      <RatingServiceProvider>
        <></>
      </RatingServiceProvider>,
    );

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalledTimes(1);
    });

    unmount();
    startSpy.mockRestore();
    appState.spy.mockRestore();
  });

  it('leaves status as unconfigured and does not call start when no token exists', async () => {
    await AsyncStorage.removeItem(SYNC_TOKEN_STORAGE_KEY);
    const appState = captureAppStateListener();

    const schedulerModule = require('./sync/sync-scheduler');
    const startSpy = jest.spyOn(schedulerModule.SyncScheduler.prototype, 'start');

    const { unmount } = render(
      <RatingServiceProvider>
        <></>
      </RatingServiceProvider>,
    );

    // Let the boot effect's async token check resolve.
    await act(async () => {
      await Promise.resolve();
    });

    const scheduler = schedulerModule.getSyncScheduler();
    expect(startSpy).not.toHaveBeenCalled();
    expect(scheduler.getStatus()).toEqual({ kind: 'unconfigured' });

    unmount();
    startSpy.mockRestore();
    appState.spy.mockRestore();
  });

  it('calls scheduler.pullNow when AppState transitions to active', async () => {
    const appState = captureAppStateListener();

    const { unmount } = render(
      <RatingServiceProvider>
        <></>
      </RatingServiceProvider>,
    );

    const scheduler = require('./sync/sync-scheduler').getSyncScheduler();
    const pullNowSpy = jest.spyOn(scheduler, 'pullNow').mockResolvedValue(undefined);

    const listener = appState.getListener();
    expect(listener).toBeTruthy();

    act(() => {
      listener?.('active');
    });

    expect(pullNowSpy).toHaveBeenCalledTimes(1);

    act(() => {
      listener?.('background');
    });
    expect(pullNowSpy).toHaveBeenCalledTimes(1);

    unmount();
    pullNowSpy.mockRestore();
    appState.spy.mockRestore();
  });

  it('removes the AppState listener on unmount', async () => {
    const appState = captureAppStateListener();

    const { unmount } = render(
      <RatingServiceProvider>
        <></>
      </RatingServiceProvider>,
    );

    expect(appState.removeSpy).not.toHaveBeenCalled();

    unmount();

    expect(appState.removeSpy).toHaveBeenCalledTimes(1);
    appState.spy.mockRestore();
  });

  it('reads the token from AsyncStorage on every api call so settings edits take effect without reinit', async () => {
    await AsyncStorage.setItem(SYNC_TOKEN_STORAGE_KEY, 'first-token');

    const fetchCalls: Array<{ url: string; headers: Record<string, string> }> = [];
    const fetchImpl = jest.fn(async (url: string, init: any) => {
      fetchCalls.push({ url, headers: init?.headers ?? {} });
      return {
        ok: true,
        status: 200,
        json: async () => ({ records: [], errors: [], server_time: 'now' }),
      };
    });

    const { loadSyncToken } = require('./sync/wiring');
    const apiClient = new CloudRatingApiClient({
      getToken: loadSyncToken,
      fetchImpl: fetchImpl as any,
    });

    await apiClient.sync({ records: [] });
    expect(fetchCalls[0].headers.Authorization).toBe('Bearer first-token');

    await AsyncStorage.setItem(SYNC_TOKEN_STORAGE_KEY, 'second-token');

    await apiClient.sync({ records: [] });
    expect(fetchCalls[1].headers.Authorization).toBe('Bearer second-token');
  });

  it('exposes the service and scheduler through useRatingService', () => {
    const appState = captureAppStateListener();

    const captured: Array<ReturnType<typeof useRatingService>> = [];
    function Probe() {
      captured.push(useRatingService());
      return null;
    }

    const { unmount } = render(
      <RatingServiceProvider>
        <Probe />
      </RatingServiceProvider>,
    );

    const contextSnapshot = captured[0];
    expect(contextSnapshot).toBeTruthy();
    expect(contextSnapshot.service).toBe(getRatingsService());
    expect(typeof contextSnapshot.scheduler.start).toBe('function');
    expect(typeof contextSnapshot.scheduler.pullNow).toBe('function');

    unmount();
    appState.spy.mockRestore();
  });
});

describe('Provider integration with createRating export', () => {
  beforeEach(() => {
    resetSyncSchedulerForTests();
    clearRatingsCache();
  });

  afterEach(() => {
    resetSyncSchedulerForTests();
    clearRatingsCache();
    jest.restoreAllMocks();
  });

  it('routes module-level createRating through the scheduler-notified service after provider mounts', async () => {
    const appState = captureAppStateListener();

    const { unmount } = render(
      <RatingServiceProvider>
        <></>
      </RatingServiceProvider>,
    );

    const scheduler = require('./sync/sync-scheduler').getSyncScheduler();
    const notifySpy = jest.spyOn(scheduler, 'notifyLocalChange');

    await act(async () => {
      await createRating({ rating: 3, efficiency: 3 });
    });

    expect(notifySpy).toHaveBeenCalledTimes(1);

    unmount();
    appState.spy.mockRestore();
  });
});
