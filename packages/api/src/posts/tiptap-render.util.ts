// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateHTML } = require('@tiptap/html/server') as typeof import('@tiptap/html');
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Mark, Node, mergeAttributes } from '@tiptap/core';

// Custom FontSize mark (mirror client)
const FontSize = Mark.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

// Shared attr: marks a media node as sensitive. Must mirror the client
// declaration in apps/web .../tiptap-extensions.ts — drift breaks parse roundtrip.
const sensitiveAttr = {
  sensitive: {
    default: false,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-sensitive') === 'true',
    renderHTML: (attrs: { sensitive?: boolean }) =>
      attrs.sensitive ? { 'data-sensitive': 'true' } : {},
  },
};

const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      poster: { default: null },
      ...sensitiveAttr,
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
  Youtube.extend({
    addAttributes() {
      return { ...this.parent?.(), ...sensitiveAttr };
    },
  }).configure({ controls: true, nocookie: true }),
  Image.extend({
    addAttributes() {
      return { ...this.parent?.(), ...sensitiveAttr };
    },
  }).configure({ HTMLAttributes: { class: 'max-w-full h-auto rounded my-4' } }),
  Underline,
  Highlight.configure({ multicolor: true }),
  Subscript,
  Superscript,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  Video,
  Embed,
];

export function renderTiptapToHtml(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  try {
    let html = generateHTML(json as never, EXTENSIONS) as string;
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
    html = wrapSensitiveMedia(html);
    return html;
  } catch {
    return '';
  }
}

const IMAGE_OVERLAY = 'Hình ảnh nhạy cảm, muốn xem thì nhấn vào?';
const VIDEO_OVERLAY = 'Video nhạy cảm, muốn xem thì nhấn vào?';

export function wrapSensitiveMedia(html: string): string {
  let out = html.replace(/<img\b[^>]*\bdata-sensitive="true"[^>]*\/?>/g, (m) =>
    buildSensitiveWrapper(m, 'image', IMAGE_OVERLAY),
  );
  out = out.replace(/<iframe\b[^>]*\bdata-sensitive="true"[^>]*>\s*<\/iframe>/g, (m) =>
    buildSensitiveWrapper(m, 'video', VIDEO_OVERLAY),
  );
  out = out.replace(/<video\b[^>]*\bdata-sensitive="true"[^>]*>[\s\S]*?<\/video>/g, (m) =>
    buildSensitiveWrapper(m, 'video', VIDEO_OVERLAY),
  );
  return out;
}

function buildSensitiveWrapper(inner: string, kind: 'image' | 'video', text: string): string {
  const aria = kind === 'image' ? 'Hiện hình ảnh nhạy cảm' : 'Hiện video nhạy cảm';
  return (
    `<span class="sensitive-media" data-media="${kind}">` +
    inner +
    `<button type="button" class="sensitive-overlay" aria-label="${aria}">` +
    `<span class="sensitive-overlay__text">${text}</span>` +
    `</button>` +
    `</span>`
  );
}
