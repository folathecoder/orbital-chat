import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../lib/api';
import type { Conversation } from '../types';

function getPathId(): string | null {
  const match = window.location.pathname.match(/^\/chat\/(.+)$/);
  return match?.[1] ?? null;
}

function setPathId(id: string | null) {
  const target = id ? `/chat/${id}` : '/';
  if (window.location.pathname !== target) {
    window.history.pushState(null, '', target);
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(getPathId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await api.fetchConversations();
      setConversations(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load conversations'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handlePopState = () => {
      setSelectedId(getPathId());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (
      !loading &&
      selectedId &&
      !conversations.find((c) => c.id === selectedId)
    ) {
      setSelectedId(null);
      setPathId(null);
    }
  }, [loading, conversations, selectedId]);

  const create = useCallback(async () => {
    try {
      setError(null);
      const conversation = await api.createConversation();
      setConversations((prev) => [conversation, ...prev]);
      setSelectedId(conversation.id);
      setPathId(conversation.id);
      return conversation;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create conversation'
      );
      return null;
    }
  }, []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    setPathId(id);
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      setError(null);
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setSelectedId((prev) => {
        const next = prev === id ? null : prev;
        setPathId(next);
        return next;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete conversation'
      );
    }
  }, []);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  return {
    conversations,
    selected,
    selectedId,
    loading,
    error,
    create,
    select,
    remove,
    refresh,
  };
}
