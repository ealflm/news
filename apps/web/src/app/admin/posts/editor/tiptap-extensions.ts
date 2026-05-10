import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';

export const editorExtensions = [
  StarterKit,
  Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener', target: '_blank' } }),
  Youtube.configure({ controls: true, nocookie: true }),
];
