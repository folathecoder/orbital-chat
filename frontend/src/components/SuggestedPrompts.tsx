import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

interface SuggestedPromptsProps {
	suggestions: string[];
	loading: boolean;
	onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({
	suggestions,
	loading,
	onSelect,
}: SuggestedPromptsProps) {
	if (loading) {
		return (
			<div className="flex flex-col items-center gap-3 px-4">
				<p className="mb-1 text-xs text-neutral-400">
					Generating suggestions...
				</p>
				<div className="flex w-full max-w-md flex-col gap-2">
					{[1, 2, 3, 4].map((i) => (
						<div
							key={i}
							className="h-10 animate-pulse rounded-lg bg-neutral-100"
							style={{ animationDelay: `${i * 100}ms` }}
						/>
					))}
				</div>
			</div>
		);
	}

	if (suggestions.length === 0) return null;

	return (
		<div className="flex flex-col items-center gap-3 px-4">
			<div className="flex items-center gap-2">
				<MessageSquare className="h-3.5 w-3.5 text-neutral-400" />
				<p className="text-xs text-neutral-400">
					Suggested questions
				</p>
			</div>
			<div className="flex w-full max-w-lg flex-col gap-2">
				{suggestions.map((suggestion, i) => (
					<motion.button
						key={suggestion}
						type="button"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							delay: i * 0.08,
							duration: 0.25,
							ease: "easeOut",
						}}
						onClick={() => onSelect(suggestion)}
						className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
					>
						{suggestion}
					</motion.button>
				))}
			</div>
		</div>
	);
}
