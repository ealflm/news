import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';

const EXTENSIONS = [StarterKit];

export function renderTiptapToHtml(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  try {
    return generateHTML(json as never, EXTENSIONS);
  } catch {
    return '';
  }
}
