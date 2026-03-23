import { Check, Copy, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useCallback, useState } from "react";

interface MessageActionsProps {
	messageId: string;
	content: string;
	feedback: "up" | "down" | null;
	onFeedback: (
		messageId: string,
		feedback: "up" | "down" | null,
		comment?: string,
	) => void;
}

export function MessageActions({
	messageId,
	content,
	feedback,
	onFeedback,
}: MessageActionsProps) {
	const [copied, setCopied] = useState(false);
	const [showComment, setShowComment] = useState(false);
	const [comment, setComment] = useState("");

	const handleCopy = useCallback(async () => {
		const cleanContent = content.replace(/\[\^\d+\]/g, "");
		await navigator.clipboard.writeText(cleanContent);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}, [content]);

	const handleThumbsUp = useCallback(() => {
		const next = feedback === "up" ? null : "up";
		onFeedback(messageId, next);
		setShowComment(false);
		setComment("");
	}, [messageId, feedback, onFeedback]);

	const handleThumbsDown = useCallback(() => {
		if (feedback === "down") {
			onFeedback(messageId, null);
			setShowComment(false);
			setComment("");
		} else {
			onFeedback(messageId, "down");
			setShowComment(true);
		}
	}, [messageId, feedback, onFeedback]);

	const handleSubmitComment = useCallback(() => {
		if (comment.trim()) {
			onFeedback(messageId, "down", comment.trim());
		}
		setShowComment(false);
		setComment("");
	}, [messageId, comment, onFeedback]);

	return (
		<div className="mt-2">
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={handleThumbsUp}
					className={`rounded p-1 transition-colors ${
						feedback === "up"
							? "text-neutral-900"
							: "text-neutral-300 hover:text-neutral-500"
					}`}
					title="Helpful"
				>
					<ThumbsUp className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onClick={handleThumbsDown}
					className={`rounded p-1 transition-colors ${
						feedback === "down"
							? "text-neutral-900"
							: "text-neutral-300 hover:text-neutral-500"
					}`}
					title="Not helpful"
				>
					<ThumbsDown className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onClick={handleCopy}
					className="rounded p-1 text-neutral-300 transition-colors hover:text-neutral-500"
					title="Copy"
				>
					{copied ? (
						<Check className="h-3.5 w-3.5 text-green-500" />
					) : (
						<Copy className="h-3.5 w-3.5" />
					)}
				</button>
			</div>

			{showComment && feedback === "down" && (
				<div className="mt-2 flex items-center gap-2">
					<input
						type="text"
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						placeholder="What went wrong?"
						className="h-8 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-neutral-300"
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								handleSubmitComment();
							}
							if (e.key === "Escape") {
								setShowComment(false);
								setComment("");
							}
						}}
					/>
					<button
						type="button"
						onClick={handleSubmitComment}
						disabled={!comment.trim()}
						className="h-8 rounded-lg bg-neutral-900 px-3 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
					>
						Send
					</button>
					<button
						type="button"
						onClick={() => {
							setShowComment(false);
							setComment("");
						}}
						className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:text-neutral-600"
						title="Dismiss"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			)}
		</div>
	);
}
