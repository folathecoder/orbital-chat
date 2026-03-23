import { ChevronLeft, ChevronRight, FileText, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Document as PDFDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { getDocumentUrl } from "../lib/api";
import type { CitationHighlight, Document } from "../types";
import { Button } from "./ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

interface ViewerContentProps {
	document: Document | null;
	width: number;
	onResize?: (e: React.MouseEvent) => void;
	showResizeHandle: boolean;
	showHeader?: boolean;
	onClose?: () => void;
	citationHighlight?: CitationHighlight | null;
	onClearHighlight?: () => void;
}

export function ViewerContent({
	document,
	width,
	onResize,
	showResizeHandle,
	showHeader = true,
	onClose,
	citationHighlight,
	onClearHighlight,
}: ViewerContentProps) {
	const [numPages, setNumPages] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState(1);
	const [pdfLoading, setPdfLoading] = useState(true);
	const [pdfError, setPdfError] = useState<string | null>(null);
	const [highlightText, setHighlightText] = useState<string | null>(null);

	useEffect(() => {
		setCurrentPage(1);
		setPdfLoading(true);
		setPdfError(null);
		setHighlightText(null);
	}, [document?.id]);

	useEffect(() => {
		if (
			citationHighlight &&
			document &&
			citationHighlight.documentId === document.id
		) {
			const targetPage = Math.min(
				citationHighlight.pageNumber,
				numPages || citationHighlight.pageNumber,
			);
			setCurrentPage(targetPage);
			setHighlightText(citationHighlight.quotedText);
		}
	}, [citationHighlight, document, numPages]);

	const customTextRenderer = useCallback(
		(textItem: { str: string }) => {
			if (!highlightText || !textItem.str.trim()) return textItem.str;

			const normalise = (s: string) =>
				s.replace(/\u00AD/g, "").replace(/\s+/g, " ").toLowerCase().trim();

			const words = normalise(highlightText)
				.split(/\s+/)
				.filter((w) => w.length > 3);

			if (words.length === 0) return textItem.str;

			const itemText = normalise(textItem.str);
			const matchCount = words.filter((w) => itemText.includes(w)).length;
			const matchRatio = matchCount / words.length;

			if (matchRatio >= 0.3 || matchCount >= 3) {
				return `<mark class="highlight-citation">${textItem.str}</mark>`;
			}
			return textItem.str;
		},
		[highlightText],
	);

	const handleViewerClick = useCallback(
		(e: React.MouseEvent) => {
			if (
				!(e.target as Element).closest(".highlight-citation") &&
				highlightText
			) {
				setHighlightText(null);
				onClearHighlight?.();
			}
		},
		[highlightText, onClearHighlight],
	);

	const pdfPageWidth = Math.max(200, width - 48);

	if (!document) {
		return (
			<div className="flex h-full flex-col items-center justify-center bg-neutral-50">
				<FileText className="mb-3 h-10 w-10 text-neutral-300" />
				<p className="text-sm text-neutral-400">No document uploaded</p>
			</div>
		);
	}

	const pdfUrl = getDocumentUrl(document.id);

	return (
		<div className="relative flex h-full flex-col bg-white">
			{showResizeHandle && (
				<div
					className="absolute top-0 left-0 z-10 h-full w-1.5 cursor-col-resize transition-colors hover:bg-neutral-300"
					onMouseDown={onResize}
				/>
			)}

			{showHeader && (
				<div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium text-neutral-800">
							{document.filename}
						</p>
						<p className="text-xs text-neutral-400">
							{document.page_count} page
							{document.page_count !== 1 ? "s" : ""}
						</p>
					</div>
					{onClose && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 flex-shrink-0"
							onClick={onClose}
							title="Close"
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
			)}

			<div
				className="flex-1 overflow-y-auto p-4"
				onClick={handleViewerClick}
			>
				{pdfError && (
					<div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
						{pdfError}
					</div>
				)}

				<PDFDocument
					file={pdfUrl}
					onLoadSuccess={({ numPages: pages }) => {
						setNumPages(pages);
						setPdfLoading(false);
						setPdfError(null);
					}}
					onLoadError={(error) => {
						setPdfError(`Failed to load PDF: ${error.message}`);
						setPdfLoading(false);
					}}
					loading={
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
						</div>
					}
				>
					{!pdfLoading && !pdfError && (
						<Page
							pageNumber={currentPage}
							width={pdfPageWidth}
							renderTextLayer={true}
							renderAnnotationLayer={true}
							customTextRenderer={customTextRenderer}
							loading={
								<div className="flex items-center justify-center py-12">
									<Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
								</div>
							}
						/>
					)}
				</PDFDocument>
			</div>

			{numPages > 0 && (
				<div className="flex items-center justify-center gap-3 border-t border-neutral-100 px-4 py-2.5">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						disabled={currentPage <= 1}
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="text-xs text-neutral-500">
						Page {currentPage} of {numPages}
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						disabled={currentPage >= numPages}
						onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
