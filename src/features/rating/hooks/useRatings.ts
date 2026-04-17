import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createRating,
  listRatings,
  removeRating,
  subscribeToRatingChanges,
  updateRating,
} from '../services';
import type { RatingInput, RatingUpdateInput } from '../services';
import type { TimeSlotRating } from '../types';

export function useRatings(): {
  ratings: TimeSlotRating[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (input: RatingInput, id?: string) => Promise<TimeSlotRating>;
  remove: (id: string) => Promise<void>;
} {
  const [ratings, setRatings] = useState<TimeSlotRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const data = await listRatings();
      if (!isMountedRef.current) return;
      setRatings(data);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load ratings');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  const save = useCallback(
    async (input: RatingInput, id?: string) => {
      try {
        const rating = id
          ? await updateRating(id, input as RatingUpdateInput)
          : await createRating(input);
        await refresh();
        setError(null);
        return rating;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save rating';
        setError(message);
        throw err;
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await removeRating(id);
        await refresh();
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove rating';
        setError(message);
        throw err;
      }
    },
    [refresh],
  );

  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    const unsubscribe = subscribeToRatingChanges(() => {
      refresh();
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [refresh]);

  return { ratings, loading, error, refresh, save, remove };
}
