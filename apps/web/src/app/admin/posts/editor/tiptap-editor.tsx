'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { editorExtensions } from './tiptap-extensions';
import { useEffect } from 'react';

interface Props {
  content: unknown;
  onChange: (json: unknown) => void;
}

export function TiptapEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: (content ?? { type: 'doc', content: [] }) as never,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[400px] rounded border bg-white p-4 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content as never);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (active: boolean, label: string, action: () => void) => (
    <button
      type="button"
      onClick={action}
      className={`rounded border px-2 py-1 text-xs ${active ? 'bg-black text-white' : 'bg-white'}`}
    >
      {label}
    </button>
  );
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {btn(editor.isActive('bold'), 'B', () => editor.chain().focus().toggleBold().run())}
      {btn(editor.isActive('italic'), 'I', () => editor.chain().focus().toggleItalic().run())}
      {btn(editor.isActive('heading', { level: 2 }), 'H2', () =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
      )}
      {btn(editor.isActive('heading', { level: 3 }), 'H3', () =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
      )}
      {btn(editor.isActive('bulletList'), '•', () =>
        editor.chain().focus().toggleBulletList().run(),
      )}
      {btn(editor.isActive('orderedList'), '1.', () =>
        editor.chain().focus().toggleOrderedList().run(),
      )}
      {btn(editor.isActive('blockquote'), '"', () =>
        editor.chain().focus().toggleBlockquote().run(),
      )}
      {btn(false, 'Link', () => {
        const url = window.prompt('URL?');
        if (url) editor.chain().focus().setLink({ href: url }).run();
      })}
      {btn(false, 'YouTube', () => {
        const url = window.prompt('YouTube URL?');
        if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
      })}
      {btn(false, 'Undo', () => editor.chain().focus().undo().run())}
      {btn(false, 'Redo', () => editor.chain().focus().redo().run())}
    </div>
  );
}
