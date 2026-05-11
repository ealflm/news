import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';
import { Node, mergeAttributes } from '@tiptap/core';

export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
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

// Embed: stores raw HTML, rendered server-side as raw HTML
export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      html: { default: '' },
      provider: { default: '' },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-embed-provider]',
        getAttrs: (node) => {
          if (typeof node === 'string') return false;
          const el = node as HTMLElement;
          const b64 = el.getAttribute('data-embed-html') ?? '';
          return {
            provider: el.getAttribute('data-embed-provider') ?? '',
            html: b64 ? decodeBase64(b64) : el.innerHTML,
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    // Render an opaque placeholder; the wrapper carries the html in a data-attr
    return [
      'div',
      {
        'data-embed-provider': HTMLAttributes.provider ?? '',
        'data-embed-html': encodeBase64(HTMLAttributes.html ?? ''),
        class: 'embed-placeholder my-4',
      },
    ];
  },
});

function encodeBase64(s: string): string {
  if (typeof window === 'undefined') return Buffer.from(s, 'utf8').toString('base64');
  return btoa(unescape(encodeURIComponent(s)));
}

function decodeBase64(s: string): string {
  if (typeof window === 'undefined') return Buffer.from(s, 'base64').toString('utf8');
  try {
    return decodeURIComponent(escape(atob(s)));
  } catch {
    return s;
  }
}

export const editorExtensions = [
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
