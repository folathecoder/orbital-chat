import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { useEffect, useReducer, useState } from 'react';
import { relativeTime } from '../lib/utils';
import type { Conversation } from '../types';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface SidebarContentProps {
  conversations: Conversation[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function SidebarContent({
  conversations,
  selectedId,
  loading,
  onSelect,
  onCreate,
  onDelete,
}: SidebarContentProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: forceUpdate is a stable dispatch, interval should run once
  useEffect(() => {
    const interval = setInterval(forceUpdate, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full w-[250px] flex-shrink-0 flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 p-3">
        <span className="text-sm font-semibold text-neutral-700">Chats</span>
        <Button variant="ghost" size="icon" onClick={onCreate} title="New chat">
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-full overflow-hidden p-2">
          {loading && conversations.length === 0 && (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-1">
                  <div className="h-4 w-3/4 rounded bg-neutral-100" />
                  <div className="h-3 w-1/2 rounded bg-neutral-50" />
                </div>
              ))}
            </div>
          )}

          {!loading && conversations.length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-neutral-400">
              No conversations yet
            </p>
          )}

          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              role="button"
              tabIndex={0}
              className={`group flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-lg px-3 py-2.5 text-left transition-colors ${
                selectedId === conversation.id
                  ? 'bg-neutral-100'
                  : 'hover:bg-neutral-50'
              }`}
              onClick={() => onSelect(conversation.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(conversation.id);
                }
              }}
              onMouseEnter={() => setHoveredId(conversation.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-800" title={conversation.title}>
                  {conversation.title}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="truncate text-xs text-neutral-400">
                    {relativeTime(conversation.updated_at)}
                  </span>
                  {conversation.document_count > 0 && (
                    <span className="flex-shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                      {conversation.document_count}{' '}
                      {conversation.document_count === 1 ? 'doc' : 'docs'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                {hoveredId === conversation.id && (
                  <button
                    type="button"
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conversation.id);
                    }}
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
