import { useCallback, useEffect } from "react";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { DocumentViewer } from "./components/DocumentViewer";
import { TooltipProvider } from "./components/ui/tooltip";
import { useConversations } from "./hooks/use-conversations";
import { useDocuments } from "./hooks/use-documents";
import { useLayoutStore } from "./hooks/use-layout-store";
import { useMessages } from "./hooks/use-messages";
import { useSuggestions } from "./hooks/use-suggestions";
import type { Citation } from "./types";

export default function App() {
	const {
		conversations,
		selected,
		selectedId,
		loading: conversationsLoading,
		create,
		select,
		remove,
		refresh: refreshConversations,
	} = useConversations();

	const {
		messages,
		loading: messagesLoading,
		error: messagesError,
		streaming,
		streamingContent,
		send,
		submitFeedback,
	} = useMessages(selectedId);

	const {
		sidebarOpen,
		docViewerOpen,
		docSidebarView,
		activeDocumentId,
		isMobile,
		toggleSidebar,
		toggleDocViewer,
		setDocSidebarView,
		setActiveDocumentId,
		citationHighlight,
		setCitationHighlight,
	} = useLayoutStore();

	const {
		documents,
		activeDocument,
		uploading,
		upload,
		remove: removeDocument,
	} = useDocuments(selectedId, activeDocumentId, setActiveDocumentId);

	const { suggestions, loading: suggestionsLoading } = useSuggestions(
		selectedId,
		documents.length,
		messages.length,
	);

	useEffect(() => {
		window.document.title = selected
			? `${selected.title} — Orbital`
			: "Orbital — Document Q&A";
	}, [selected]);

	const handleSend = useCallback(
		async (content: string) => {
			await send(content);
			refreshConversations();
		},
		[send, refreshConversations],
	);

	const handleUpload = useCallback(
		async (files: File[]) => {
			await upload(files);
			refreshConversations();
		},
		[upload, refreshConversations],
	);

	const handleRemoveDocument = useCallback(
		async (documentId: string) => {
			await removeDocument(documentId);
			refreshConversations();
		},
		[removeDocument, refreshConversations],
	);

	const handleCitationClick = useCallback(
		(citation: Citation) => {
			if (!citation.document_id) return;
			setActiveDocumentId(citation.document_id);
			setDocSidebarView("preview");
			if (!docViewerOpen) toggleDocViewer();
			setCitationHighlight({
				documentId: citation.document_id,
				pageNumber: citation.page_number,
				quotedText: citation.quoted_text,
			});
		},
		[
			setActiveDocumentId,
			setDocSidebarView,
			docViewerOpen,
			toggleDocViewer,
			setCitationHighlight,
		],
	);

	const handleClearHighlight = useCallback(() => {
		setCitationHighlight(null);
	}, [setCitationHighlight]);

	return (
		<TooltipProvider delayDuration={200}>
			<div className="flex h-screen bg-neutral-50">
				<ChatSidebar
					conversations={conversations}
					selectedId={selectedId}
					loading={conversationsLoading}
					onSelect={(id) => {
						select(id);
						if (isMobile) toggleSidebar();
					}}
					onCreate={() => {
						create();
						if (isMobile) toggleSidebar();
					}}
					onDelete={remove}
					open={sidebarOpen}
					onToggle={toggleSidebar}
					isMobile={isMobile}
				/>

				<ChatWindow
					messages={messages}
					loading={messagesLoading}
					error={messagesError}
					streaming={streaming}
					streamingContent={streamingContent}
					documentCount={documents.length}
					documents={documents}
					uploading={uploading}
					conversationId={selectedId}
					onSend={handleSend}
					onUpload={handleUpload}
					onToggleSidebar={toggleSidebar}
					onToggleDocViewer={toggleDocViewer}
					sidebarOpen={sidebarOpen}
					docViewerOpen={docViewerOpen}
					conversationTitle={selected?.title}
					onCitationClick={handleCitationClick}
					onFeedback={submitFeedback}
					suggestions={suggestions}
					suggestionsLoading={suggestionsLoading}
				/>

				<DocumentViewer
					documents={documents}
					activeDocument={activeDocument}
					activeDocumentId={activeDocumentId}
					onSelectDocument={setActiveDocumentId}
					onRemoveDocument={handleRemoveDocument}
					onUpload={handleUpload}
					uploading={uploading}
					sidebarView={docSidebarView}
					onSetSidebarView={setDocSidebarView}
					open={docViewerOpen}
					onToggle={toggleDocViewer}
					isMobile={isMobile}
					citationHighlight={citationHighlight}
					onClearHighlight={handleClearHighlight}
				/>
			</div>
		</TooltipProvider>
	);
}
