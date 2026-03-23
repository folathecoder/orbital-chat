import type {
	Conversation,
	ConversationDetail,
	Document,
	Message,
} from "../types";

const BASE = "/api";

async function throwIfError(response: Response): Promise<void> {
	if (!response.ok) {
		const text = await response.text().catch(() => "Unknown error");
		throw new Error(`API error ${response.status}: ${text}`);
	}
}

async function parseJson<T>(response: Response): Promise<T> {
	await throwIfError(response);
	return response.json() as Promise<T>;
}

export async function fetchConversations(): Promise<Conversation[]> {
	const res = await fetch(`${BASE}/conversations`);
	return parseJson<Conversation[]>(res);
}

export async function createConversation(): Promise<Conversation> {
	const res = await fetch(`${BASE}/conversations`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ title: "New conversation" }),
	});
	return parseJson<Conversation>(res);
}

export async function deleteConversation(id: string): Promise<void> {
	const res = await fetch(`${BASE}/conversations/${id}`, {
		method: "DELETE",
	});
	await throwIfError(res);
}

export async function fetchConversation(
	id: string,
): Promise<ConversationDetail> {
	const res = await fetch(`${BASE}/conversations/${id}`);
	return parseJson<ConversationDetail>(res);
}

export async function fetchMessages(
	conversationId: string,
): Promise<Message[]> {
	const res = await fetch(`${BASE}/conversations/${conversationId}/messages`);
	return parseJson<Message[]>(res);
}

export async function sendMessage(
	conversationId: string,
	content: string,
	signal?: AbortSignal,
): Promise<Response> {
	const res = await fetch(`${BASE}/conversations/${conversationId}/messages`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content }),
		signal,
	});
	await throwIfError(res);
	return res;
}

export async function fetchDocuments(
	conversationId: string,
): Promise<Document[]> {
	const res = await fetch(
		`${BASE}/conversations/${conversationId}/documents`,
	);
	return parseJson<Document[]>(res);
}

export async function uploadDocument(
	conversationId: string,
	file: File,
): Promise<Document> {
	const formData = new FormData();
	formData.append("file", file);
	const res = await fetch(`${BASE}/conversations/${conversationId}/documents`, {
		method: "POST",
		body: formData,
	});
	return parseJson<Document>(res);
}

export async function deleteDocument(documentId: string): Promise<void> {
	const res = await fetch(`${BASE}/documents/${documentId}`, {
		method: "DELETE",
	});
	await throwIfError(res);
}

export async function fetchSuggestions(
	conversationId: string,
): Promise<string[]> {
	const res = await fetch(
		`${BASE}/conversations/${conversationId}/suggestions`,
		{ method: "POST" },
	);
	const data = await parseJson<{ suggestions: string[] }>(res);
	return data.suggestions;
}

export async function submitFeedback(
	messageId: string,
	feedback: "up" | "down" | null,
	comment?: string,
): Promise<void> {
	const res = await fetch(`${BASE}/messages/${messageId}/feedback`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ feedback, comment }),
	});
	await throwIfError(res);
}

export function getDocumentUrl(documentId: string): string {
	return `${BASE}/documents/${documentId}/content`;
}
