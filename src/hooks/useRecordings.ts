import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { loadRecordings } from '../storage/recordingsStorage';
import type { SavedRecording } from '../types/recording';

export function useRecordings() {
  const [recordings, setRecordings] = useState<SavedRecording[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await loadRecordings();
      setRecordings(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { recordings, loading, refresh };
}
