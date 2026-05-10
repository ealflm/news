// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateHTML } = require('@tiptap/html/server') as typeof import('@tiptap/html');
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
