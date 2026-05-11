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
import Placeholder from '@tiptap/extension-placeholder';
import { Node, Mark, mergeAttributes } from '@tiptap/core';

// Custom FontSize mark (built on TextStyle, MIT — no external dep)
export const FontSize = Mark.create({
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
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({
          chain,
        }: {
          chain: () => {
            setMark: (name: string, attrs: Record<string, unknown>) => { run: () => boolean };
          };
        }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({
          chain,
        }: {
          chain: () => {
            setMark: (name: string, attrs: Record<string, unknown>) => { run: () => boolean };
          };
        }) =>
          chain().setMark('textStyle', { fontSize: null }).run(),
    } as never;
  },
});

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
  StarterKit.configure({
    link: false,
    // We disable some StarterKit defaults that we replace with explicit imports
  }),
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
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading') return `Tiêu đề mức ${node.attrs.level}`;
      return 'Bắt đầu viết nội dung...';
    },
  }),
  Video,
  Embed,
];
