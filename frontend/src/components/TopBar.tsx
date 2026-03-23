import {
  FileText,
  PanelLeft,
  PanelLeftClose,
  PanelRightClose,
} from 'lucide-react';
import { Button } from './ui/button';

interface TopBarProps {
  onToggleSidebar: () => void;
  onToggleDocViewer: () => void;
  sidebarOpen: boolean;
  docViewerOpen: boolean;
  conversationTitle: string | null;
}

export function TopBar({
  onToggleSidebar,
  onToggleDocViewer,
  sidebarOpen,
  docViewerOpen,
  conversationTitle,
}: TopBarProps) {
  return (
    <div className="flex items-center gap-1 border-b border-neutral-100 px-2 py-2 sm:gap-2 sm:p-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 flex-shrink-0"
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeft className="h-4 w-4" />
        )}
      </Button>
      <p
        className="w-0 flex-1 truncate text-xs font-medium text-neutral-700 sm:text-sm"
        title={conversationTitle ?? undefined}
      >
        {conversationTitle}
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 flex-shrink-0"
        onClick={onToggleDocViewer}
        title={docViewerOpen ? 'Close document viewer' : 'Open document viewer'}
      >
        {docViewerOpen ? (
          <PanelRightClose className="h-4 w-4" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
