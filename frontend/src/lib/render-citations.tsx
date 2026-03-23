import { marked } from 'marked';
import type { Citation } from '../types';

export function buildCitationMap(citations: Citation[]): Map<number, Citation> {
  return new Map(citations.map((c) => [c.citation_index, c]));
}

export function renderCitedContent(
  content: string,
  citations: Citation[]
): { html: string; citationMap: Map<number, Citation> } {
  const citationMap = buildCitationMap(citations);

  const withPlaceholders = content.replace(/\[\^(\d+)\]/g, (_, num) => {
    const idx = Number.parseInt(num, 10);
    return `<span class="citation-badge" data-citation-index="${idx}">${idx}</span>`;
  });

  const html = marked.parse(withPlaceholders, { async: false }) as string;

  return { html, citationMap };
}
