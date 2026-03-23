import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api';

export function useSuggestions(
  conversationId: string | null,
  documentCount: number,
  messageCount: number
) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!conversationId || documentCount === 0 || messageCount > 0) {
      setSuggestions([]);
      return;
    }
    try {
      setLoading(true);
      const result = await api.fetchSuggestions(conversationId);
      setSuggestions(result);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, documentCount, messageCount]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { suggestions, loading };
}
