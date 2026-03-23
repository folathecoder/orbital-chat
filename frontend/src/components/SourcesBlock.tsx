import { useState } from "react";
import type { Citation } from "../types";

interface SourcesBlockProps {
	citations: Citation[];
	onCitationClick: (citation: Citation) => void;
}

export function SourcesBlock({
	citations,
	onCitationClick,
}: SourcesBlockProps) {
	const [expanded, setExpanded] = useState(false);

	if (citations.length === 0) return null;

	const visible = expanded ? citations : citations.slice(0, 3);

	return (
		<div className="mt-3 border-t border-neutral-100 pt-3">
			<p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
				Sources
			</p>
			<div className="space-y-2">
				{visible.map((citation) => (
					<div
						key={citation.citation_index}
						className="group flex items-start gap-2"
					>
						<span className="mt-0.5 flex-shrink-0 font-mono text-xs text-neutral-400">
							[{citation.citation_index}]
						</span>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-xs font-medium text-neutral-800">
									{citation.document_name}
								</span>
								<span className="text-xs text-neutral-400">
									p.{citation.page_number}
								</span>
							</div>
							<p className="mt-0.5 line-clamp-2 text-xs italic text-neutral-400">
								&ldquo;{citation.quoted_text}&rdquo;
							</p>
						</div>
						<button
							type="button"
							onClick={() => onCitationClick(citation)}
							className="flex-shrink-0 whitespace-nowrap text-xs text-neutral-400 opacity-0 transition-opacity hover:text-neutral-700 group-hover:opacity-100"
						>
							View &rarr;
						</button>
					</div>
				))}
			</div>
			{citations.length > 3 && (
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="mt-2 text-xs text-neutral-400 hover:text-neutral-700"
				>
					{expanded ? "Show less" : `Show all ${citations.length} sources`}
				</button>
			)}
		</div>
	);
}
