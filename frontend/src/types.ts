export interface Conversation {
	id: string;
	title: string;
	created_at: string;
	updated_at: string;
	document_count: number;
}

export interface Citation {
	citation_index: number;
	document_id: string | null;
	document_name: string;
	page_number: number;
	quoted_text: string;
}

export interface Message {
	id: string;
	conversation_id: string;
	role: "user" | "assistant" | "system";
	content: string;
	sources_cited: number;
	citations: Citation[];
	feedback: "up" | "down" | null;
	feedback_comment: string | null;
	created_at: string;
}

export interface Document {
	id: string;
	conversation_id: string;
	filename: string;
	page_count: number;
	has_text: boolean;
	uploaded_at: string;
}

export interface ConversationDetail extends Conversation {
	documents: Document[];
}

export interface CitationHighlight {
	documentId: string;
	pageNumber: number;
	quotedText: string;
}
