import type { TimeSlotRating } from '../types';
import type { RatingRepository } from '../storage/repository';

export interface SyncScheduler {
  notifyLocalChange(): void;
}

export class SyncingRatingRepository implements RatingRepository {
  constructor(
    private readonly local: RatingRepository,
    private readonly scheduler: SyncScheduler,
  ) {}

  list(): Promise<TimeSlotRating[]> {
    return this.local.list();
  }

  get(id: string): Promise<TimeSlotRating | null> {
    return this.local.get(id);
  }

  async save(rating: TimeSlotRating): Promise<void> {
    await this.local.save(rating);
    this.scheduler.notifyLocalChange();
  }

  async remove(id: string): Promise<void> {
    await this.local.remove(id);
    this.scheduler.notifyLocalChange();
  }

  listPendingSync(): Promise<TimeSlotRating[]> {
    return this.local.listPendingSync();
  }

  markSynced(id: string, syncedAt: string): Promise<void> {
    return this.local.markSynced(id, syncedAt);
  }

  subscribe(listener: () => void): () => void {
    if (this.local.subscribe) {
      return this.local.subscribe(listener);
    }
    return () => {};
  }
}
