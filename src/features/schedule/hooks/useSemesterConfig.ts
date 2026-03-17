import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSemester, subscribeToSemester } from '../services';
import { SemesterConfig } from '../types';

export function useSemesterConfig(): {
  semester: SemesterConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [semester, setSemester] = useState<SemesterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const data = await loadSemester();
    if (!isMountedRef.current) return;
    setSemester(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    const unsubscribe = subscribeToSemester(() => {
      loadSemester().then((data) => {
        if (!isMountedRef.current) return;
        setSemester(data);
        setLoading(false);
      });
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [refresh]);

  return { semester, loading, refresh };
}
