import { useCallback, useEffect, useRef, useState } from 'react';
import { loadEvents, subscribeToEvents } from '../services/events.service';
import { ScheduleEvent } from '../types';

export function useEvents(): {
  events: ScheduleEvent[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const data = await loadEvents();
    if (!isMountedRef.current) return;
    setEvents(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    const unsubscribe = subscribeToEvents(() => {
      loadEvents().then((data) => {
        if (!isMountedRef.current) return;
        setEvents(data);
      });
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [refresh]);

  return { events, loading, refresh };
}
