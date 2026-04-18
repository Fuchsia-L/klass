import type { TimeSlotRating } from '../types';

export interface RatingRepository {
  list(): Promise<TimeSlotRating[]>;
  listAll(): Promise<TimeSlotRating[]>;
  get(id: string): Promise<TimeSlotRating | null>;
  save(rating: TimeSlotRating): Promise<void>;
  remove(id: string): Promise<void>;
  listPendingSync(): Promise<TimeSlotRating[]>;
  markSynced(id: string, syncedAt: string): Promise<void>;
  subscribe?(listener: () => void): () => void;
}
