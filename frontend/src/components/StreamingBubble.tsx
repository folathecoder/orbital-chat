import DOMPurify from "dompurify";
import { useMemo } from "react";
import { marked } from "marked";
import { BotAvatar } from "./BotAvatar";

interface StreamingBubbleProps {
	content: string;
}

function processStreamingContent(text: string): string {
	const sourcesIdx = text.indexOf("---SOURCES---");
	const stripped = sourcesIdx !== -1 ? text.slice(0, sourcesIdx).trim() : text;

	const withBadges = stripped.replace(
		/\[\^(\d+)\]/g,
		'<span class="citation-badge">$1</span>',
	);

	const html = marked.parse(withBadges, { async: false }) as string;
	return DOMPurify.sanitize(html);
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
	const html = useMemo(() => processStreamingContent(content), [content]);

	return (
		<div className="flex gap-3 py-1.5">
			<BotAvatar />
			<div className="streaming-content min-w-0 flex-1 overflow-hidden">
				{content ? (
					<div
						className="prose max-w-none break-words"
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				) : (
					<div className="flex items-center gap-1 py-2">
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.15s" }}
						/>
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.3s" }}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
