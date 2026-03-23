import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Citation } from "../types";

interface CitationTooltipProps {
	citation: Citation | null;
	anchor: HTMLElement | null;
}

export function CitationTooltip({ citation, anchor }: CitationTooltipProps) {
	const tooltipRef = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

	useEffect(() => {
		if (!anchor || !citation) {
			setPos(null);
			return;
		}

		const rect = anchor.getBoundingClientRect();
		const tooltipWidth = 260;

		let left = rect.left + rect.width / 2 - tooltipWidth / 2;
		left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));

		setPos({
			top: rect.top - 8,
			left,
		});
	}, [anchor, citation]);

	if (!citation || !pos) return null;

	const quote =
		citation.quoted_text.length > 100
			? `${citation.quoted_text.slice(0, 100)}...`
			: citation.quoted_text;

	return createPortal(
		<div
			ref={tooltipRef}
			className="pointer-events-none fixed z-[100] max-w-[260px] -translate-y-full rounded-lg bg-neutral-900 px-3 py-2 shadow-lg"
			style={{ top: pos.top, left: pos.left }}
		>
			<p className="text-xs font-medium text-neutral-100">
				{citation.document_name} — p.{citation.page_number}
			</p>
			<p className="mt-1 text-xs italic text-neutral-400">
				&ldquo;{quote}&rdquo;
			</p>
			<div
				className="absolute left-1/2 -translate-x-1/2"
				style={{ top: "100%" }}
			>
				<div className="border-4 border-transparent border-t-neutral-900" />
			</div>
		</div>,
		window.document.body,
	);
}
