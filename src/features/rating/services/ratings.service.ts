import { TimeSlotRating } from '../types';
import { localRatingRepository } from '../storage';
import type { RatingRepository } from '../storage';

export type RatingInput = {
  slot_start?: string;
  slot_end?: string;
  linked_event_id?: string;
  rating: number;
  efficiency: number;
  mood?: string;
  activity?: string;
  reflection?: string;
};

export type RatingUpdateInput = Partial<Omit<RatingInput, 'rating' | 'efficiency'>> & {
  rating?: number;
  efficiency?: number;
};

export type RatingsExportData = {
  exported_at: string;
  schema_version: 1;
  ratings: TimeSlotRating[];
};

type RatingsService = {
  listRatings(): Promise<TimeSlotRating[]>;
  getRating(id: string): Promise<TimeSlotRating | null>;
  createRating(input: RatingInput): Promise<TimeSlotRating>;
  updateRating(id: string, input: RatingUpdateInput): Promise<TimeSlotRating>;
  removeRating(id: string): Promise<void>;
  listPendingSyncRatings(): Promise<TimeSlotRating[]>;
  markRatingSynced(id: string, syncedAt?: string): Promise<void>;
  exportRatings(): Promise<RatingsExportData>;
  subscribeToRatingChanges(listener: () => void): () => void;
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const UUID_PATTERN = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

function createUuid(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') return randomUUID.call(globalThis.crypto);

  return UUID_PATTERN.replace(/[xy]/g, (placeholder) => {
    const value = Math.floor(Math.random() * 16);
    const nibble = placeholder === 'x' ? value : (value & 0x3) | 0x8;
    return nibble.toString(16);
  });
}

function assertRatingValue(value: number, fieldName: 'rating' | 'efficiency'): TimeSlotRating['rating'] {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new RangeError(`${fieldName} must be an integer from 1 to 5`);
  }

  return value as TimeSlotRating['rating'];
}

function limitOptionalString(
  value: string | undefined,
  fieldName: 'mood' | 'activity' | 'reflection',
  maxLength: number,
): string | undefined {
  if (value === undefined) return undefined;
  if (value.length > maxLength) {
    throw new RangeError(`${fieldName} must be ${maxLength} characters or fewer`);
  }
  return value;
}

function assertDateString(value: string, fieldName: 'slot_start' | 'slot_end'): string {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new RangeError(`${fieldName} must be a valid date string`);
  }
  return value;
}

function createRatingService(repository: RatingRepository): RatingsService {
  const listeners = new Set<() => void>();
  let repositoryUnsubscribe: (() => void) | null = null;

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function notifyMutation() {
    if (!repository.subscribe) notify();
  }

  function ensureRepositorySubscription() {
    if (repositoryUnsubscribe || !repository.subscribe) return;
    repositoryUnsubscribe = repository.subscribe(notify);
  }

  function normalizeCreateInput(input: RatingInput): TimeSlotRating {
    const now = new Date();
    const nowIso = now.toISOString();
    const slotStart = input.slot_start
      ? assertDateString(input.slot_start, 'slot_start')
      : new Date(now.getTime() - ONE_HOUR_MS).toISOString();
    const slotEnd = input.slot_end ? assertDateString(input.slot_end, 'slot_end') : nowIso;

    return {
      id: createUuid(),
      slot_start: slotStart,
      slot_end: slotEnd,
      linked_event_id: input.linked_event_id,
      rating: assertRatingValue(input.rating, 'rating'),
      efficiency: assertRatingValue(input.efficiency, 'efficiency'),
      mood: limitOptionalString(input.mood, 'mood', 20),
      activity: limitOptionalString(input.activity, 'activity', 50),
      reflection: limitOptionalString(input.reflection, 'reflection', 200),
      created_at: nowIso,
      updated_at: nowIso,
      synced_at: null,
      schema_version: 1,
    };
  }

  function normalizeUpdateInput(
    current: TimeSlotRating,
    input: RatingUpdateInput,
  ): TimeSlotRating {
    return {
      ...current,
      slot_start:
        input.slot_start === undefined
          ? current.slot_start
          : assertDateString(input.slot_start, 'slot_start'),
      slot_end:
        input.slot_end === undefined ? current.slot_end : assertDateString(input.slot_end, 'slot_end'),
      linked_event_id:
        input.linked_event_id === undefined ? current.linked_event_id : input.linked_event_id,
      rating:
        input.rating === undefined ? current.rating : assertRatingValue(input.rating, 'rating'),
      efficiency:
        input.efficiency === undefined
          ? current.efficiency
          : assertRatingValue(input.efficiency, 'efficiency'),
      mood: input.mood === undefined ? current.mood : limitOptionalString(input.mood, 'mood', 20),
      activity:
        input.activity === undefined
          ? current.activity
          : limitOptionalString(input.activity, 'activity', 50),
      reflection:
        input.reflection === undefined
          ? current.reflection
          : limitOptionalString(input.reflection, 'reflection', 200),
      updated_at: new Date().toISOString(),
      synced_at: null,
      schema_version: 1,
    };
  }

  return {
    listRatings() {
      return repository.list();
    },

    getRating(id: string) {
      return repository.get(id);
    },

    async createRating(input: RatingInput) {
      const rating = normalizeCreateInput(input);
      await repository.save(rating);
      notifyMutation();
      return rating;
    },

    async updateRating(id: string, input: RatingUpdateInput) {
      const current = await repository.get(id);
      if (!current) {
        throw new Error(`Rating not found: ${id}`);
      }

      const rating = normalizeUpdateInput(current, input);
      await repository.save(rating);
      notifyMutation();
      return rating;
    },

    async removeRating(id: string) {
      await repository.remove(id);
      notifyMutation();
    },

    listPendingSyncRatings() {
      return repository.listPendingSync();
    },

    async markRatingSynced(id: string, syncedAt = new Date().toISOString()) {
      await repository.markSynced(id, syncedAt);
      notifyMutation();
    },

    async exportRatings() {
      return {
        exported_at: new Date().toISOString(),
        schema_version: 1,
        ratings: await repository.list(),
      };
    },

    subscribeToRatingChanges(listener: () => void) {
      ensureRepositorySubscription();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && repositoryUnsubscribe) {
          repositoryUnsubscribe();
          repositoryUnsubscribe = null;
        }
      };
    },
  };
}

const ratingsService = createRatingService(localRatingRepository);

export const listRatings = ratingsService.listRatings;
export const getRating = ratingsService.getRating;
export const createRating = ratingsService.createRating;
export const updateRating = ratingsService.updateRating;
export const removeRating = ratingsService.removeRating;
export const listPendingSyncRatings = ratingsService.listPendingSyncRatings;
export const markRatingSynced = ratingsService.markRatingSynced;
export const exportRatings = ratingsService.exportRatings;
export const subscribeToRatingChanges = ratingsService.subscribeToRatingChanges;
export { createRatingService };
