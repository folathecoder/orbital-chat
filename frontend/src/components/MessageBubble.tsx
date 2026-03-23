import DOMPurify from "dompurify";
import { motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { buildCitationMap, renderCitedContent } from "../lib/render-citations";
import type { Citation, Message } from "../types";
import { BotAvatar } from "./BotAvatar";
import { CitationTooltip } from "./CitationTooltip";
import { MessageActions } from "./MessageActions";
import { SourcesBlock } from "./SourcesBlock";

interface MessageBubbleProps {
	message: Message;
	onCitationClick?: (citation: Citation) => void;
	onFeedback?: (
		messageId: string,
		feedback: "up" | "down" | null,
		comment?: string,
	) => void;
}

export function MessageBubble({
	message,
	onCitationClick,
	onFeedback,
}: MessageBubbleProps) {
	const contentRef = useRef<HTMLDivElement>(null);
	const citations = message.citations ?? [];
	const hasCitations = citations.length > 0;
	const citationMap = hasCitations ? buildCitationMap(citations) : null;

	const [hoveredCitation, setHoveredCitation] = useState<Citation | null>(
		null,
	);
	const [hoveredAnchor, setHoveredAnchor] = useState<HTMLElement | null>(
		null,
	);

	const displayContent = useMemo(() => {
		if (hasCitations) return message.content;
		return message.content.replace(/\[\^\d+\]/g, "");
	}, [hasCitations, message.content]);

	const citedHtml = useMemo(() => {
		if (!hasCitations) return null;
		const raw = renderCitedContent(message.content, citations).html;
		return DOMPurify.sanitize(raw, { ADD_ATTR: ["data-citation-index"] });
	}, [hasCitations, message.content, citations]);

	const handleContentEvent = useCallback(
		(e: React.MouseEvent) => {
			if (!citationMap) return;
			const badge = (e.target as Element).closest(
				".citation-badge",
			) as HTMLElement | null;

			if (e.type === "click" && badge && onCitationClick) {
				const idx = Number.parseInt(
					badge.getAttribute("data-citation-index") ?? "",
					10,
				);
				const citation = citationMap.get(idx);
				if (citation) onCitationClick(citation);
				return;
			}

			if (e.type === "mouseover" && badge) {
				const idx = Number.parseInt(
					badge.getAttribute("data-citation-index") ?? "",
					10,
				);
				const citation = citationMap.get(idx);
				if (citation) {
					setHoveredCitation(citation);
					setHoveredAnchor(badge);
				}
				return;
			}

			if (e.type === "mouseout") {
				const related = (e as React.MouseEvent)
					.relatedTarget as Element | null;
				if (!related?.closest?.(".citation-badge")) {
					setHoveredCitation(null);
					setHoveredAnchor(null);
				}
			}
		},
		[citationMap, onCitationClick],
	);

	if (message.role === "system") {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.2 }}
				className="flex justify-center py-2"
			>
				<p className="text-xs text-neutral-400">{message.content}</p>
			</motion.div>
		);
	}

	if (message.role === "user") {
		return (
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex justify-end py-1.5"
			>
				<div className="max-w-[85%] rounded-2xl rounded-br-md bg-neutral-100 px-3 py-2 sm:max-w-[75%] sm:px-4 sm:py-2.5">
					<p className="whitespace-pre-wrap break-words text-sm text-neutral-800">
						{message.content}
					</p>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2 }}
			className="flex gap-3 py-1.5"
		>
			<BotAvatar />
			<div className="min-w-0 flex-1 overflow-hidden">
				{citedHtml ? (
					<div
						ref={contentRef}
						className="prose max-w-none break-words"
						onClick={handleContentEvent}
						onMouseOver={handleContentEvent}
						onMouseOut={handleContentEvent}
						dangerouslySetInnerHTML={{ __html: citedHtml }}
					/>
				) : (
					<div className="prose max-w-none break-words">
						<Streamdown>{displayContent}</Streamdown>
					</div>
				)}

				{onFeedback && (
					<MessageActions
						messageId={message.id}
						content={message.content}
						feedback={message.feedback}
						onFeedback={onFeedback}
					/>
				)}

				{hasCitations && (
					<SourcesBlock
						citations={citations}
						onCitationClick={onCitationClick ?? (() => {})}
					/>
				)}
			</div>
			<CitationTooltip citation={hoveredCitation} anchor={hoveredAnchor} />
		</motion.div>
	);
}
