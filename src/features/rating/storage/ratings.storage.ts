import { loadJSON, saveJSON, STORAGE_KEYS } from '../../../platform/storage/async-storage';
import { RatingValue, TimeSlotRating } from '../types';

let cachedRatings: TimeSlotRating[] | null = null;

const listeners = new Set<() => void>();

function cloneRatings(ratings: TimeSlotRating[]): TimeSlotRating[] {
  return ratings.map((rating) => ({ ...rating }));
}

function notifyRatingsChanged(): void {
  listeners.forEach((listener) => listener());
}

function isRatingValue(value: unknown): value is RatingValue {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalSyncDate(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || isValidDateString(value);
}

function isTimeSlotRating(value: unknown): value is TimeSlotRating {
  if (!value || typeof value !== 'object') return false;

  const rating = value as Record<string, unknown>;
  return (
    typeof rating.id === 'string' &&
    isValidDateString(rating.slot_start) &&
    isValidDateString(rating.slot_end) &&
    isOptionalString(rating.linked_event_id) &&
    isRatingValue(rating.rating) &&
    isRatingValue(rating.efficiency) &&
    isOptionalString(rating.mood) &&
    isOptionalString(rating.activity) &&
    isOptionalString(rating.reflection) &&
    isValidDateString(rating.created_at) &&
    isValidDateString(rating.updated_at) &&
    isOptionalSyncDate(rating.synced_at) &&
    isOptionalSyncDate(rating.deleted_at) &&
    rating.schema_version === 1
  );
}

function prepareRatingForSave(
  rating: TimeSlotRating,
  existingRating?: TimeSlotRating,
): TimeSlotRating {
  const now = new Date().toISOString();

  return {
    ...rating,
    created_at: existingRating?.created_at ?? rating.created_at ?? now,
    updated_at: existingRating ? now : rating.updated_at ?? now,
    schema_version: 1,
  };
}

export async function loadRatingsFromStorage(): Promise<TimeSlotRating[]> {
  if (cachedRatings) return cloneRatings(cachedRatings);

  const data = await loadJSON<unknown>(STORAGE_KEYS.ratings);
  const rawRatings = Array.isArray(data) ? data : [];
  const validRatings = rawRatings.filter((value, index): value is TimeSlotRating => {
    const valid = isTimeSlotRating(value);
    if (!valid) {
      console.warn(`Discarded invalid time slot rating at index ${index} from storage`);
    }
    return valid;
  });

  cachedRatings = cloneRatings(validRatings);
  return cloneRatings(cachedRatings);
}

async function persistRatings(ratings: TimeSlotRating[]): Promise<void> {
  cachedRatings = cloneRatings(ratings);
  await saveJSON(STORAGE_KEYS.ratings, cachedRatings);
  notifyRatingsChanged();
}

export async function listRatings(): Promise<TimeSlotRating[]> {
  return loadRatingsFromStorage();
}

export async function getRating(id: string): Promise<TimeSlotRating | null> {
  const ratings = await loadRatingsFromStorage();
  const rating = ratings.find((current) => current.id === id);
  return rating ? { ...rating } : null;
}

export async function saveRating(rating: TimeSlotRating): Promise<void> {
  const ratings = await loadRatingsFromStorage();
  const existingRating = ratings.find((current) => current.id === rating.id);
  const nextRating = prepareRatingForSave(rating, existingRating);
  const nextRatings = existingRating
    ? ratings.map((current) => (current.id === rating.id ? nextRating : current))
    : [...ratings, nextRating];

  await persistRatings(nextRatings);
}

export async function removeRating(id: string): Promise<void> {
  const ratings = await loadRatingsFromStorage();
  await persistRatings(ratings.filter((rating) => rating.id !== id));
}

export function subscribeToRatings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearRatingsCache(): void {
  cachedRatings = null;
}
