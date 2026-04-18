import { createRatingService } from './ratings.service';
import type { RatingInput } from './ratings.service';
import type { RatingRepository } from '../storage';
import type { TimeSlotRating } from '../types';

class FakeRatingRepository implements RatingRepository {
  ratings: TimeSlotRating[] = [];
  savedRatings: TimeSlotRating[] = [];
  removedIds: string[] = [];

  async list(): Promise<TimeSlotRating[]> {
    return this.ratings.map((rating) => ({ ...rating }));
  }

  async listAll(): Promise<TimeSlotRating[]> {
    return this.ratings.map((rating) => ({ ...rating }));
  }

  async get(id: string): Promise<TimeSlotRating | null> {
    const rating = this.ratings.find((current) => current.id === id);
    return rating ? { ...rating } : null;
  }

  async save(rating: TimeSlotRating): Promise<void> {
    const nextRating = { ...rating };
    this.savedRatings.push(nextRating);
    const existing = this.ratings.find((current) => current.id === rating.id);
    this.ratings = existing
      ? this.ratings.map((current) => (current.id === rating.id ? nextRating : current))
      : [...this.ratings, nextRating];
  }

  async remove(id: string): Promise<void> {
    this.removedIds.push(id);
    this.ratings = this.ratings.filter((rating) => rating.id !== id);
  }

  async listPendingSync(): Promise<TimeSlotRating[]> {
    return this.ratings.filter((rating) => rating.synced_at == null);
  }

  async markSynced(id: string, syncedAt: string): Promise<void> {
    this.ratings = this.ratings.map((rating) =>
      rating.id === id ? { ...rating, synced_at: syncedAt } : rating,
    );
  }
}

const baseInput: RatingInput = {
  rating: 4,
  efficiency: 5,
  mood: 'focused',
  activity: 'coding',
  reflection: 'steady progress',
};

describe('ratings service', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-17T08:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates ratings with default slot dates, uuid, timestamps, schema version, and unsynced state', async () => {
    const repository = new FakeRatingRepository();
    const service = createRatingService(repository);

    const rating = await service.createRating({ rating: 4, efficiency: 5 });

    expect(rating.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(rating.slot_start).toBe('2026-04-17T07:30:00.000Z');
    expect(rating.slot_end).toBe('2026-04-17T08:30:00.000Z');
    expect(rating.created_at).toBe('2026-04-17T08:30:00.000Z');
    expect(rating.updated_at).toBe('2026-04-17T08:30:00.000Z');
    expect(rating.schema_version).toBe(1);
    expect(rating.synced_at).toBeNull();
    expect(repository.savedRatings).toEqual([rating]);
  });

  it('updates updated_at while keeping created_at stable', async () => {
    const repository = new FakeRatingRepository();
    const service = createRatingService(repository);
    const created = await service.createRating(baseInput);

    jest.setSystemTime(new Date('2026-04-17T09:00:00.000Z'));

    const updated = await service.updateRating(created.id, {
      rating: 5,
      reflection: 'changed',
    });

    expect(updated.created_at).toBe(created.created_at);
    expect(updated.updated_at).toBe('2026-04-17T09:00:00.000Z');
    expect(updated.rating).toBe(5);
    expect(updated.efficiency).toBe(created.efficiency);
    expect(updated.reflection).toBe('changed');
    expect(updated.synced_at).toBeNull();
  });

  it.each([
    ['rating', 0],
    ['rating', 6],
    ['rating', 3.5],
    ['efficiency', 0],
    ['efficiency', 6],
    ['efficiency', 3.5],
  ] as const)('rejects invalid %s value %s on create', async (fieldName, value) => {
    const repository = new FakeRatingRepository();
    const service = createRatingService(repository);

    await expect(
      service.createRating({ ...baseInput, [fieldName]: value }),
    ).rejects.toThrow(RangeError);
    expect(repository.savedRatings).toHaveLength(0);
  });

  it.each([
    ['rating', 0],
    ['rating', 6],
    ['efficiency', 0],
    ['efficiency', 6],
  ] as const)('rejects invalid %s value %s on update', async (fieldName, value) => {
    const repository = new FakeRatingRepository();
    const service = createRatingService(repository);
    const created = await service.createRating(baseInput);

    await expect(service.updateRating(created.id, { [fieldName]: value })).rejects.toThrow(
      RangeError,
    );
  });

  it('accepts optional fields at their maximum length', async () => {
    const repository = new FakeRatingRepository();
    const service = createRatingService(repository);

    const rating = await service.createRating({
      rating: 5,
      efficiency: 4,
      mood: 'm'.repeat(20),
      activity: 'a'.repeat(50),
      reflection: 'r'.repeat(200),
    });

    expect(rating.mood).toHaveLength(20);
    expect(rating.activity).toHaveLength(50);
    expect(rating.reflection).toHaveLength(200);
  });

  it.each([
    ['mood', 21],
    ['activity', 51],
    ['reflection', 201],
  ] as const)('rejects %s longer than %s characters', async (fieldName, length) => {
    const repository = new FakeRatingRepository();
    const service = createRatingService(repository);

    await expect(
      service.createRating({ ...baseInput, [fieldName]: 'x'.repeat(length) }),
    ).rejects.toThrow(RangeError);
    expect(repository.savedRatings).toHaveLength(0);
  });

  it('uses repository methods for list, get, remove, pending sync, mark synced, and export', async () => {
    const repository = new FakeRatingRepository();
    const service = createRatingService(repository);
    const created = await service.createRating(baseInput);

    expect(await service.listRatings()).toEqual([created]);
    expect(await service.getRating(created.id)).toEqual(created);
    expect(await service.listPendingSyncRatings()).toEqual([created]);

    await service.markRatingSynced(created.id, '2026-04-17T10:00:00.000Z');
    expect((await service.getRating(created.id))?.synced_at).toBe('2026-04-17T10:00:00.000Z');

    const exported = await service.exportRatings();
    expect(exported.schema_version).toBe(1);
    expect(exported.exported_at).toBe('2026-04-17T08:30:00.000Z');
    expect(exported.ratings).toEqual(await repository.list());

    await service.removeRating(created.id);
    expect(repository.removedIds).toEqual([created.id]);
    expect(await service.listRatings()).toEqual([]);
  });
});
