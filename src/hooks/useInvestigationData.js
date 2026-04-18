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
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
