import { useCallback, useEffect, useRef, useState } from 'react';
import type { CitationHighlight } from '../types';

const MOBILE_BP = 768;
const TABLET_BP = 1024;
const STORAGE_KEY = 'orbital:layout';

export type DocSidebarView = 'list' | 'preview';

interface LayoutState {
  sidebarOpen: boolean;
  docViewerOpen: boolean;
  docSidebarView: DocSidebarView;
  activeDocumentId: string | null;
}

function readPersistedState(): Partial<LayoutState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<LayoutState>;
  } catch {}
  return null;
}

function persistState(state: LayoutState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function getDefaults(width: number): LayoutState {
  const base: LayoutState = {
    sidebarOpen: true,
    docViewerOpen: true,
    docSidebarView: 'list',
    activeDocumentId: null,
  };

  if (width < MOBILE_BP) {
    return { ...base, sidebarOpen: false, docViewerOpen: false };
  }

  const persisted = readPersistedState();
  if (width < TABLET_BP) {
    return {
      ...base,
      sidebarOpen: false,
      docViewerOpen: false,
      ...persisted,
    };
  }
  return { ...base, ...persisted };
}

export function useLayoutStore() {
  const [state, setState] = useState<LayoutState>(() =>
    getDefaults(window.innerWidth)
  );
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BP);
  const stateRef = useRef(state);
  stateRef.current = state;

  const update = useCallback((patch: Partial<LayoutState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      persistState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let prevWidth = window.innerWidth;

    const handleResize = () => {
      const width = window.innerWidth;
      const wasMobile = prevWidth < MOBILE_BP;
      const nowMobile = width < MOBILE_BP;
      prevWidth = width;

      setIsMobile(nowMobile);

      if (!wasMobile && nowMobile) {
        update({ sidebarOpen: false, docViewerOpen: false });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [update]);

  const toggleSidebar = useCallback(() => {
    update({ sidebarOpen: !stateRef.current.sidebarOpen });
  }, [update]);

  const toggleDocViewer = useCallback(() => {
    update({ docViewerOpen: !stateRef.current.docViewerOpen });
  }, [update]);

  const setDocSidebarView = useCallback(
    (view: DocSidebarView) => {
      update({ docSidebarView: view });
    },
    [update]
  );

  const setActiveDocumentId = useCallback(
    (id: string | null) => {
      update({ activeDocumentId: id });
    },
    [update]
  );

  const [citationHighlight, setCitationHighlight] =
    useState<CitationHighlight | null>(null);

  return {
    sidebarOpen: state.sidebarOpen,
    docViewerOpen: state.docViewerOpen,
    docSidebarView: state.docSidebarView,
    activeDocumentId: state.activeDocumentId,
    isMobile,
    toggleSidebar,
    toggleDocViewer,
    setDocSidebarView,
    setActiveDocumentId,
    citationHighlight,
    setCitationHighlight,
  };
}
