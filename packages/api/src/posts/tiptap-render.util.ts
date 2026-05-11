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
  Image.configure({ HTMLAttributes: { class: 'max-w-full h-auto rounded my-4' } }),
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
    return html;
  } catch {
    return '';
  }
}
