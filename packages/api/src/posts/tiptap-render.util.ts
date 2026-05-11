// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateHTML } = require('@tiptap/html/server') as typeof import('@tiptap/html');
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';
import { Node, mergeAttributes } from '@tiptap/core';

const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      poster: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'video[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        controls: 'true',
        class: 'max-w-full rounded-lg my-4',
        preload: 'metadata',
      }),
    ];
  },
});

const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      html: { default: '' },
      provider: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-embed-provider]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {
        'data-embed-provider': HTMLAttributes.provider ?? '',
        'data-embed-html': Buffer.from(HTMLAttributes.html ?? '', 'utf8').toString('base64'),
        class: 'embed-placeholder my-4',
      },
    ];
  },
});

const EXTENSIONS = [
  StarterKit.configure({ link: false }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener', target: '_blank' },
  }),
  Youtube.configure({ controls: true, nocookie: true }),
  Image.configure({ HTMLAttributes: { class: 'max-w-full h-auto rounded' } }),
  Video,
  Embed,
];

export function renderTiptapToHtml(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  try {
    let html = generateHTML(json as never, EXTENSIONS) as string;
    // Replace embed placeholders with actual HTML
    html = html.replace(
      /<div[^>]*data-embed-html="([^"]*)"[^>]*><\/div>/g,
      (_match, b64: string) => {
        try {
          const raw = Buffer.from(b64, 'base64').toString('utf8');
          return `<div class="embed-wrap my-4">${raw}</div>`;
        } catch {
          return '';
        }
      },
    );
    return html;
  } catch {
    return '';
  }
}
