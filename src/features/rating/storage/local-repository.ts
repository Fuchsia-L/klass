import type { TimeSlotRating } from '../types';
import type { RatingRepository } from './repository';
import {
  getRating,
  listRatings,
  saveRating,
  subscribeToRatings,
} from './ratings.storage';

function isTombstoned(rating: TimeSlotRating): boolean {
  return rating.deleted_at != null;
}

export class LocalRatingRepository implements RatingRepository {
  async list(): Promise<TimeSlotRating[]> {
    const ratings = await listRatings();
    return ratings.filter((rating) => !isTombstoned(rating));
  }

  async listAll(): Promise<TimeSlotRating[]> {
    return listRatings();
  }

  async get(id: string): Promise<TimeSlotRating | null> {
    const rating = await getRating(id);
    if (!rating || isTombstoned(rating)) return null;
    return rating;
  }

  save(rating: TimeSlotRating): Promise<void> {
    return saveRating(rating);
  }

  async remove(id: string): Promise<void> {
    const rating = await getRating(id);
    if (!rating || isTombstoned(rating)) return;

    const now = new Date().toISOString();
    await saveRating({
      ...rating,
      updated_at: now,
      deleted_at: now,
      synced_at: null,
    });
  }

  async listPendingSync(): Promise<TimeSlotRating[]> {
    const ratings = await listRatings();
    return ratings.filter((rating) => rating.synced_at == null);
  }

  async markSynced(id: string, syncedAt: string): Promise<void> {
    const rating = await getRating(id);
    if (!rating) return;

    await saveRating({ ...rating, synced_at: syncedAt });
  }

  subscribe(listener: () => void): () => void {
    return subscribeToRatings(listener);
  }
}

export const localRatingRepository = new LocalRatingRepository();
