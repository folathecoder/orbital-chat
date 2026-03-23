import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../lib/api';
import type { Document } from '../types';

export function useDocuments(
  conversationId: string | null,
  activeDocumentId: string | null,
  setActiveDocumentId: (id: string | null) => void
) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDocRef = useRef(activeDocumentId);
  activeDocRef.current = activeDocumentId;

  const refresh = useCallback(async () => {
    if (!conversationId) {
      setDocuments([]);
      setActiveDocumentId(null);
      return;
    }
    try {
      setError(null);
      const docs = await api.fetchDocuments(conversationId);
      setDocuments(docs);
      const currentActive = activeDocRef.current;
      if (!currentActive || !docs.some((d) => d.id === currentActive)) {
        setActiveDocumentId(docs[0]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    }
  }, [conversationId, setActiveDocumentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = useCallback(
    async (files: File[]) => {
      if (!conversationId || files.length === 0) return;
      try {
        setUploading(true);
        setError(null);
        const uploaded: Document[] = [];
        for (const file of files) {
          const doc = await api.uploadDocument(conversationId, file);
          uploaded.push(doc);
          setDocuments((prev) => [...prev, doc]);
        }
        const lastDoc = uploaded[uploaded.length - 1];
        if (lastDoc) {
          setActiveDocumentId(lastDoc.id);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to upload document'
        );
      } finally {
        setUploading(false);
      }
    },
    [conversationId, setActiveDocumentId]
  );

  const remove = useCallback(
    async (documentId: string) => {
      try {
        setError(null);
        await api.deleteDocument(documentId);
        setDocuments((prev) => {
          const next = prev.filter((d) => d.id !== documentId);
          if (activeDocumentId === documentId) {
            setActiveDocumentId(next[0]?.id ?? null);
          }
          return next;
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete document'
        );
      }
    },
    [activeDocumentId, setActiveDocumentId]
  );

  const activeDocument = useMemo(
    () => documents.find((d) => d.id === activeDocumentId) ?? null,
    [documents, activeDocumentId]
  );

  return {
    documents,
    activeDocument,
    uploading,
    error,
    upload,
    remove,
    refresh,
  };
}
