import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';

export const editorExtensions = [
  StarterKit.configure({ link: false }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener', target: '_blank' },
  }),
  Youtube.configure({ controls: true, nocookie: true }),
  Image.configure({ HTMLAttributes: { class: 'max-w-full h-auto rounded' } }),
];
