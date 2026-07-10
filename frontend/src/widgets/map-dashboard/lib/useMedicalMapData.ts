import { useEffect, useState } from 'react';

import { fetchMockMedicalData } from '../../../data/api/medical';
import type { DistrictMedicalRecord } from '../../../shared/types/medical';

export function useMedicalMapData() {
  const [data, setData] = useState<DistrictMedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    
    // Pass signal down if fetchMockMedicalData supports it, or just use it to prevent unmounted state updates
    fetchMockMedicalData()
      .then((payload) => {
        if (!abortController.signal.aborted) {
          setData(payload.records);
        }
      })
      .catch((err: unknown) => {
        if (abortController.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        setError(message);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => abortController.abort();
  }, []);

  return { data, loading, error };
}
