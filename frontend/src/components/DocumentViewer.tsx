import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, FileText, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { CitationHighlight, Document } from "../types";
import type { DocSidebarView } from "../hooks/use-layout-store";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { ViewerContent } from "./ViewerContent";

const MIN_WIDTH = 280;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 400;

interface DocumentViewerProps {
	documents: Document[];
	activeDocument: Document | null;
	activeDocumentId: string | null;
	onSelectDocument: (id: string) => void;
	onRemoveDocument: (id: string) => void;
	onUpload: (files: File[]) => void;
	uploading: boolean;
	sidebarView: DocSidebarView;
	onSetSidebarView: (view: DocSidebarView) => void;
	open: boolean;
	onToggle: () => void;
	isMobile: boolean;
	citationHighlight?: CitationHighlight | null;
	onClearHighlight?: () => void;
}

function DocumentList({
	documents,
	activeDocumentId,
	uploading,
	onSelect,
	onRemove,
	onUpload,
	onClose,
}: {
	documents: Document[];
	activeDocumentId: string | null;
	uploading: boolean;
	onSelect: (id: string) => void;
	onRemove: (id: string) => void;
	onUpload: (files: File[]) => void;
	onClose?: () => void;
}) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	return (
		<div className="flex h-full flex-col overflow-hidden bg-white">
			<div className="flex items-center justify-between border-b border-neutral-100 p-3">
				<span className="text-sm font-semibold text-neutral-700">
					Documents
				</span>
				<div className="flex items-center gap-1">
					{uploading && (
						<Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
					)}
					<input
						ref={fileInputRef}
						type="file"
						accept=".pdf"
						multiple
						className="hidden"
						onChange={(e) => {
							const files = Array.from(e.target.files ?? []);
							if (files.length > 0) onUpload(files);
							if (fileInputRef.current) fileInputRef.current.value = "";
						}}
					/>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => fileInputRef.current?.click()}
						title="Upload documents"
					>
						<Plus className="h-4 w-4" />
					</Button>
					{onClose && (
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							title="Close"
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>

			<ScrollArea className="flex-1">
				<div className="max-w-full overflow-hidden">
				{documents.length === 0 && !uploading ? (
					<div className="flex flex-col items-center justify-center px-4 py-12">
						<Upload className="mb-3 h-8 w-8 text-neutral-300" />
						<p className="text-sm text-neutral-400">No documents yet</p>
					</div>
				) : (
					<div className="p-2">
						{documents.map((doc) => (
							<div
								key={doc.id}
								role="button"
								tabIndex={0}
								className={`group flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-left transition-colors ${
									activeDocumentId === doc.id
										? "bg-neutral-100"
										: "hover:bg-neutral-50"
								}`}
								onClick={() => onSelect(doc.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onSelect(doc.id);
									}
								}}
							>
								<FileText className="h-4 w-4 flex-shrink-0 text-neutral-400" />
								<div className="w-0 flex-1">
									<p className="truncate text-sm font-medium text-neutral-800" title={doc.filename}>
										{doc.filename}
									</p>
									<div className="mt-0.5 flex items-center gap-1.5">
										<span className="text-xs text-neutral-400">
											{doc.page_count} {doc.page_count === 1 ? "page" : "pages"}
										</span>
										{!doc.has_text && (
											<span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-700">
												No text
											</span>
										)}
									</div>
								</div>
								<button
									type="button"
									className="rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-200 hover:text-red-500 group-hover:opacity-100"
									onClick={(e) => {
										e.stopPropagation();
										onRemove(doc.id);
									}}
									title="Remove document"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							</div>
						))}
					</div>
				)}
				</div>
			</ScrollArea>
		</div>
	);
}

function PreviewView({
	document,
	width,
	onBack,
	onClose,
	citationHighlight,
	onClearHighlight,
}: {
	document: Document | null;
	width: number;
	onBack: () => void;
	onClose?: () => void;
	citationHighlight?: CitationHighlight | null;
	onClearHighlight?: () => void;
}) {
	return (
		<div className="flex h-full flex-col bg-white">
			<div className="flex items-center gap-2 border-b border-neutral-100 p-3">
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 flex-shrink-0"
					onClick={onBack}
					title="Back to documents"
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				{document && (
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium text-neutral-700">
							{document.filename}
						</p>
					</div>
				)}
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
			<div className="flex-1 overflow-hidden">
				<ViewerContent
					document={document}
					width={width}
					showHeader={false}
					showResizeHandle={false}
					onClose={onClose}
					citationHighlight={citationHighlight}
					onClearHighlight={onClearHighlight}
				/>
			</div>
		</div>
	);
}

export function DocumentViewer({
	documents,
	activeDocument,
	activeDocumentId,
	onSelectDocument,
	onRemoveDocument,
	onUpload,
	uploading,
	sidebarView,
	onSetSidebarView,
	open,
	onToggle,
	isMobile,
	citationHighlight,
	onClearHighlight,
}: DocumentViewerProps) {
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [dragging, setDragging] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef<number>(0);
	const widthRef = useRef(width);
	widthRef.current = width;

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setDragging(true);

		const startX = e.clientX;
		const startWidth = widthRef.current;

		const handleMouseMove = (moveEvent: MouseEvent) => {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = requestAnimationFrame(() => {
				const delta = startX - moveEvent.clientX;
				const newWidth = Math.min(
					MAX_WIDTH,
					Math.max(MIN_WIDTH, startWidth + delta),
				);
				setWidth(newWidth);
			});
		};

		const handleMouseUp = () => {
			cancelAnimationFrame(rafRef.current);
			setDragging(false);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
	}, []);

	const handleSelectAndPreview = useCallback(
		(id: string) => {
			onSelectDocument(id);
			onSetSidebarView("preview");
		},
		[onSelectDocument, onSetSidebarView],
	);

	const handleBack = useCallback(() => {
		onSetSidebarView("list");
	}, [onSetSidebarView]);

	const effectiveView =
		sidebarView === "preview" && activeDocument ? "preview" : "list";

	const mobileClose = isMobile ? onToggle : undefined;

	const content =
		effectiveView === "preview" ? (
			<PreviewView
				document={activeDocument}
				width={isMobile ? Math.min(window.innerWidth, 512) : width}
				onBack={handleBack}
				onClose={mobileClose}
				citationHighlight={citationHighlight}
				onClearHighlight={onClearHighlight}
			/>
		) : (
			<DocumentList
				documents={documents}
				activeDocumentId={activeDocumentId}
				uploading={uploading}
				onSelect={handleSelectAndPreview}
				onRemove={onRemoveDocument}
				onUpload={onUpload}
				onClose={mobileClose}
			/>
		);

	if (isMobile) {
		return (
			<AnimatePresence>
				{open && (
					<>
						<motion.div
							key="docviewer-backdrop"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 z-50 bg-black/40"
							onClick={onToggle}
						/>
						<motion.div
							key="docviewer-panel"
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{ duration: 0.2, ease: "easeInOut" }}
							className="fixed top-0 right-0 z-50 h-full w-full max-w-lg shadow-xl"
						>
							{content}
						</motion.div>
					</>
				)}
			</AnimatePresence>
		);
	}

	return (
		<div
			ref={containerRef}
			style={{
				width: open ? width : 0,
				transition: dragging ? "none" : "width 200ms ease-in-out",
			}}
			className={`relative h-full flex-shrink-0 overflow-hidden border-l border-neutral-200 ${
				dragging ? "select-none" : ""
			}`}
		>
			<div
				className="absolute top-0 left-0 z-10 h-full w-1.5 cursor-col-resize transition-colors hover:bg-neutral-300"
				onMouseDown={handleMouseDown}
			/>
			<div style={{ width }} className="h-full">
				{content}
			</div>
		</div>
	);
}
