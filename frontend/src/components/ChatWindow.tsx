import { ArrowDown, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Message } from "../types";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { MessageBubble } from "./MessageBubble";
import { StreamingBubble } from "./StreamingBubble";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { TopBar } from "./TopBar";

interface ChatWindowProps {
	messages: Message[];
	loading: boolean;
	error: string | null;
	streaming: boolean;
	streamingContent: string;
	documentCount: number;
	documents: import("../types").Document[];
	uploading: boolean;
	conversationId: string | null;
	onSend: (content: string) => void;
	onUpload: (files: File[]) => void;
	onToggleSidebar: () => void;
	onToggleDocViewer: () => void;
	sidebarOpen: boolean;
	docViewerOpen: boolean;
	conversationTitle?: string;
	onCitationClick?: (citation: import("../types").Citation) => void;
	onFeedback?: (messageId: string, feedback: "up" | "down" | null, comment?: string) => void;
	suggestions: string[];
	suggestionsLoading: boolean;
}

export function ChatWindow({
	messages,
	loading,
	error,
	streaming,
	streamingContent,
	documentCount,
	documents,
	uploading,
	conversationId,
	onSend,
	onUpload,
	onToggleSidebar,
	onToggleDocViewer,
	sidebarOpen,
	docViewerOpen,
	conversationTitle,
	onCitationClick,
	onFeedback,
	suggestions,
	suggestionsLoading,
}: ChatWindowProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [prefill, setPrefill] = useState<string | undefined>(undefined);
	const shouldAutoScroll = useRef(true);
	const hasInitiallyScrolled = useRef(false);
	const [showScrollButton, setShowScrollButton] = useState(false);
	const [stableTitle, setStableTitle] = useState<string | null>(null);

	useEffect(() => {
		if (conversationTitle) {
			setStableTitle(conversationTitle);
		} else if (!conversationId) {
			setStableTitle(null);
		}
	}, [conversationTitle, conversationId]);

	const displayTitle = conversationTitle || stableTitle;

	const messagesLength = messages.length;

	useEffect(() => {
		hasInitiallyScrolled.current = false;
		shouldAutoScroll.current = true;
		setShowScrollButton(false);
	}, [conversationId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional triggers for auto-scroll
	useEffect(() => {
		if (!scrollRef.current) return;

		if (!hasInitiallyScrolled.current && messagesLength > 0) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
			hasInitiallyScrolled.current = true;
			return;
		}

		if (shouldAutoScroll.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messagesLength, streamingContent]);

	const handleScroll = () => {
		const el = scrollRef.current;
		if (!el) return;
		const isNearBottom =
			el.scrollHeight - el.scrollTop - el.clientHeight < 100;
		shouldAutoScroll.current = isNearBottom;
		setShowScrollButton(!isNearBottom);
	};

	const scrollToBottom = () => {
		if (scrollRef.current) {
			scrollRef.current.scrollTo({
				top: scrollRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
		shouldAutoScroll.current = true;
		setShowScrollButton(false);
	};

	const topBar = (
		<TopBar
			onToggleSidebar={onToggleSidebar}
			onToggleDocViewer={onToggleDocViewer}
			sidebarOpen={sidebarOpen}
			docViewerOpen={docViewerOpen}
			conversationTitle={displayTitle ?? null}
		/>
	);

	if (!conversationId) {
		return (
			<div className="flex flex-1 flex-col bg-neutral-50">
				{topBar}
				<div className="flex flex-1 items-center justify-center">
					<p className="text-sm text-neutral-400">
						Select a conversation or create a new one
					</p>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="flex flex-1 flex-col bg-white">
				{topBar}
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
				</div>
			</div>
		);
	}

	if (messages.length === 0 && !streaming) {
		return (
			<div className="flex flex-1 flex-col bg-white">
				{topBar}
				<div className="flex flex-1 items-center justify-center">
					{documentCount > 0 ? (
						<div className="flex flex-col items-center gap-4">
							<p className="text-sm text-neutral-500">
								{documentCount} {documentCount === 1 ? "document" : "documents"} uploaded
							</p>
							<SuggestedPrompts
								suggestions={suggestions}
								loading={suggestionsLoading}
								onSelect={(prompt) => setPrefill(prompt)}
							/>
						</div>
					) : (
						<EmptyState onUpload={onUpload} uploading={uploading} />
					)}
				</div>
				<ChatInput
					onSend={onSend}
					onUpload={onUpload}
					disabled={streaming}
					documents={documents}
					prefill={prefill}
					onPrefillConsumed={() => setPrefill(undefined)}
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col bg-white">
			{topBar}

			{error && (
				<div className="mx-4 mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
					{error}
				</div>
			)}

			<div className="relative flex-1 overflow-hidden">
				<div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
					<div className="mx-auto max-w-2xl space-y-1">
						{messages.map((message) => (
							<MessageBubble
							key={message.id}
							message={message}
							onCitationClick={onCitationClick}
							onFeedback={onFeedback}
						/>
						))}
						{streaming && <StreamingBubble content={streamingContent} />}
					</div>
				</div>

				{showScrollButton && (
					<button
						type="button"
						onClick={scrollToBottom}
						className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-neutral-200 bg-white p-2 shadow-md transition-colors hover:bg-neutral-50"
						title="Scroll to bottom"
					>
						<ArrowDown className="h-4 w-4 text-neutral-600" />
					</button>
				)}
			</div>

			<ChatInput
				onSend={onSend}
				onUpload={onUpload}
				disabled={streaming}
				documents={documents}
				prefill={prefill}
				onPrefillConsumed={() => setPrefill(undefined)}
			/>
		</div>
	);
}
