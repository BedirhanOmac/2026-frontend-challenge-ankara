import { useState, useEffect, useCallback } from 'react';
import { fetchAllData } from '../api/jotform';

export function useInvestigationData() {
  const [data, setData] = useState({
    checkins: [],
    messages: [],
    sightings: [],
    notes: [],
    tips: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const result = await fetchAllData();
        if (!cancelled) setData(result);
      } catch (err) {
        console.error('[useInvestigationData] fetch failed:', err);
        if (!cancelled) setError(err);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [retryCount]);

  const retry = useCallback(() => setRetryCount(c => c + 1), []);

  return { data, loading, error, retry };
}
