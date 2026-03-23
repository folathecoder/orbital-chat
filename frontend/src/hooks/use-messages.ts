import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../lib/api';
import type { Message } from '../types';

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(!!conversationId);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchMessages(conversationId);
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    refresh();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [refresh]);

  const send = useCallback(
    async (content: string) => {
      if (!conversationId || streaming) return;

      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content,
        sources_cited: 0,
        citations: [],
        feedback: null,
        feedback_comment: null,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setStreaming(true);
      setStreamingContent('');
      setError(null);

      try {
        const controller = new AbortController();
        abortRef.current = controller;
        const response = await api.sendMessage(
          conversationId,
          content,
          controller.signal
        );

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';
        let receivedFinalMessage = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data) as {
                type?: string;
                content?: string;
                message?: Message;
              };

              if (parsed.type === 'content' && parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              } else if (parsed.type === 'message' && parsed.message) {
                setMessages((prev) => [...prev, parsed.message as Message]);
                accumulated = '';
                receivedFinalMessage = true;
              }
            } catch (e) {
              if (import.meta.env.DEV) {
                console.warn('Failed to parse SSE data:', data, e);
              }
            }
          }
        }

        if (accumulated && !receivedFinalMessage) {
          const assistantMessage: Message = {
            id: `stream-${Date.now()}`,
            conversation_id: conversationId,
            role: 'assistant',
            content: accumulated,
            sources_cited: 0,
            citations: [],
            feedback: null,
            feedback_comment: null,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }

        const freshMessages = await api.fetchMessages(conversationId);
        setMessages(freshMessages);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setStreaming(false);
        setStreamingContent('');
      }
    },
    [conversationId, streaming]
  );

  const submitFeedback = useCallback(
    async (
      messageId: string,
      feedback: 'up' | 'down' | null,
      comment?: string
    ) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, feedback, feedback_comment: comment ?? null }
            : m
        )
      );
      try {
        await api.submitFeedback(messageId, feedback, comment);
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, feedback: null, feedback_comment: null }
              : m
          )
        );
      }
    },
    []
  );

  return {
    messages,
    loading,
    error,
    streaming,
    streamingContent,
    send,
    refresh,
    submitFeedback,
  };
}
