// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateHTML } = require('@tiptap/html/server') as typeof import('@tiptap/html');
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';

const EXTENSIONS = [
  StarterKit.configure({ link: false }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener', target: '_blank' },
  }),
  Youtube.configure({ controls: true, nocookie: true }),
  Image.configure({ HTMLAttributes: { class: 'max-w-full h-auto rounded' } }),
];

export function renderTiptapToHtml(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  try {
    return generateHTML(json as never, EXTENSIONS);
  } catch {
    return '';
  }
}
