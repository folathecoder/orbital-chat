import { FileText, Paperclip, SendHorizontal } from 'lucide-react';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Document } from '../types';
import { Button } from './ui/button';

interface ChatInputProps {
  onSend: (content: string) => void;
  onUpload: (files: File[]) => void;
  disabled: boolean;
  documents?: Document[];
  prefill?: string;
  onPrefillConsumed?: () => void;
}

interface MentionState {
  active: boolean;
  query: string;
  startIndex: number;
  selectedIndex: number;
}

const MENTION_INITIAL: MentionState = {
  active: false,
  query: '',
  startIndex: 0,
  selectedIndex: 0,
};

export function ChatInput({
  onSend,
  onUpload,
  disabled,
  documents = [],
  prefill,
  onPrefillConsumed,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [mention, setMention] = useState<MentionState>(MENTION_INITIAL);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !disabled;

  useEffect(() => {
    if (prefill && prefill !== value) {
      setValue(prefill);
      onPrefillConsumed?.();
      textareaRef.current?.focus();
    }
  }, [prefill]);

  const filtered = mention.active
    ? documents.filter((d) =>
        d.filename.toLowerCase().includes(mention.query.toLowerCase())
      )
    : [];

  const closeMention = () => setMention(MENTION_INITIAL);

  const insertMention = (filename: string) => {
    const before = value.slice(0, mention.startIndex);
    const after = value.slice(mention.startIndex + mention.query.length + 1);
    const newValue = `${before}@${filename} ${after}`;
    setValue(newValue);
    closeMention();
    textareaRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPos);

    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex >= 0 && documents.length > 0) {
      const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || atIndex === 0) {
        const query = textBeforeCursor.slice(atIndex + 1);
        if (!query.includes(' ') && !query.includes('\n')) {
          setMention({
            active: true,
            query,
            startIndex: atIndex,
            selectedIndex: 0,
          });
          return;
        }
      }
    }
    closeMention();
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(trimmed);
    setValue('');
    closeMention();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention.active && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMention((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, filtered.length - 1),
        }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMention((prev) => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0),
        }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const selected = filtered[mention.selectedIndex];
        if (selected) {
          e.preventDefault();
          insertMention(selected.filename);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMention();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        onUpload(files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onUpload]
  );

  useEffect(() => {
    if (!mention.active || filtered.length === 0) return;
    const item = dropdownRef.current?.children[mention.selectedIndex] as
      | HTMLElement
      | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [mention.active, mention.selectedIndex, filtered.length]);

  return (
    <div className="border-t border-neutral-200 bg-white px-2 py-2 sm:px-3 sm:py-3">
      <div className="relative mx-auto sm:max-w-2xl">
        {mention.active && filtered.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 z-20 mb-1 max-h-[160px] w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg sm:mb-2 sm:max-h-[200px]"
          >
            {filtered.map((doc, i) => (
              <button
                key={doc.id}
                type="button"
                className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm transition-colors sm:gap-2.5 sm:px-3 ${
                  i === mention.selectedIndex
                    ? 'bg-neutral-100'
                    : 'hover:bg-neutral-50'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(doc.filename);
                }}
              >
                <FileText className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-800">
                    {doc.filename}
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs text-neutral-400">
                  {doc.page_count} {doc.page_count === 1 ? 'pg' : 'pgs'}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title="Upload document"
          >
            <Paperclip className="h-4 w-4 text-neutral-500" />
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setTimeout(closeMention, 150);
            }}
            placeholder={
              documents.length > 0
                ? 'Ask a question... Type @ to mention a document'
                : 'Ask a question about your documents...'
            }
            rows={1}
            className="max-h-[200px] min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-base text-neutral-800 placeholder-neutral-400 outline-none sm:text-sm"
            disabled={disabled}
          />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            disabled={!canSend}
            onClick={handleSend}
          >
            <SendHorizontal
              className={`h-4 w-4 ${
                canSend ? 'text-neutral-900' : 'text-neutral-300'
              }`}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
