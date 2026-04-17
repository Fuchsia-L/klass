import { TimeSlotRating } from '../types';
import { RatingRepository } from './repository';
import { getRating, listRatings, removeRating, saveRating } from './ratings.storage';

export class LocalRatingRepository implements RatingRepository {
  list(): Promise<TimeSlotRating[]> {
    return listRatings();
  }

  get(id: string): Promise<TimeSlotRating | null> {
    return getRating(id);
  }

  save(rating: TimeSlotRating): Promise<void> {
    return saveRating(rating);
  }

  remove(id: string): Promise<void> {
    return removeRating(id);
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
}

export const localRatingRepository = new LocalRatingRepository();
