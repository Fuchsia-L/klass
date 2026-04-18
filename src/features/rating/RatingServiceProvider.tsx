import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { configureRatingsService, createRatingService, type RatingsService } from './services';
import { localRatingRepository } from './storage';
import { CloudRatingApiClient } from './sync/api-client';
import {
  getSyncScheduler,
  type SyncScheduler as SyncSchedulerClass,
} from './sync/sync-scheduler';
import { SyncingRatingRepository } from './sync/syncing-repository';
import { loadSyncToken } from './sync/wiring';

export type RatingServiceContextValue = {
  service: RatingsService;
  scheduler: SyncSchedulerClass;
};

const RatingServiceContext = createContext<RatingServiceContextValue | null>(null);

export function useRatingService(): RatingServiceContextValue {
  const value = useContext(RatingServiceContext);
  if (!value) {
    throw new Error('useRatingService must be used inside a RatingServiceProvider');
  }
  return value;
}

export function RatingServiceProvider({ children }: { children: ReactNode }) {
  // Build scheduler, wrapper, and service synchronously during first render so
  // children (which call useRatings via the module-level singleton) observe the
  // SyncingRatingRepository-backed service on their very first mount.
  const contextValue = useMemo<RatingServiceContextValue>(() => {
    const apiClient = new CloudRatingApiClient({ getToken: loadSyncToken });
    const scheduler = getSyncScheduler({
      repository: localRatingRepository,
      apiClient,
      initialStatus: { kind: 'unconfigured' },
    });
    const syncingRepository = new SyncingRatingRepository(localRatingRepository, scheduler);
    const service = createRatingService(syncingRepository);
    configureRatingsService(service);
    return { service, scheduler };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const { scheduler } = contextValue;

    (async () => {
      const token = await loadSyncToken();
      if (cancelled) return;
      if (token && token.length > 0) {
        scheduler.start();
      }
    })();

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void scheduler.pullNow();
      }
    };
    const subscription: NativeEventSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [contextValue]);

  return (
    <RatingServiceContext.Provider value={contextValue}>{children}</RatingServiceContext.Provider>
  );
}
