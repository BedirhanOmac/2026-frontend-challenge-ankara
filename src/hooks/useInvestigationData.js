import { useState, useEffect } from 'react';
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchAllData();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        console.error('[useInvestigationData] fetch failed:', err);
        if (!cancelled) {
          setError(err);
        }
      } finally {
        // Always stop loading — cancelled only guards data/error state updates
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
