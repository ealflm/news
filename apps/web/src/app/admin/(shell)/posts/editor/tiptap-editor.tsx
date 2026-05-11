'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { editorExtensions } from './tiptap-extensions';
import { useEffect } from 'react';
import type { MediaRecord } from '@news/shared';

interface Props {
  content: unknown;
  onChange: (json: unknown) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/media', { method: 'POST', body: fd });
  if (!res.ok) return null;
  const data = (await res.json()) as { media: MediaRecord };
  if (data.media.variants && typeof data.media.variants === 'object') {
    const v = data.media.variants as Record<string, string>;
    const path = v['1280w'] ?? v['720w'] ?? v['320w'] ?? data.media.originalPath;
    return path ? `${API_URL}${path}` : null;
  }
  return data.media.originalPath ? `${API_URL}${data.media.originalPath}` : null;
}

async function uploadVideoFile(file: File): Promise<{ src: string; poster?: string } | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/media', { method: 'POST', body: fd });
  if (!res.ok) return null;
  const data = (await res.json()) as { media: MediaRecord };
  const v = (data.media.variants ?? null) as Record<string, string> | null;
  const src = v?.['720p']
    ? `${API_URL}${v['720p']}`
    : data.media.originalPath
      ? `${API_URL}${data.media.originalPath}`
      : null;
  if (!src) return null;
  const poster = v?.poster ? `${API_URL}${v.poster}` : undefined;
  return poster ? { src, poster } : { src };
}

async function createEmbedFromUrl(url: string): Promise<{ html: string; provider: string } | null> {
  const res = await fetch('/api/media/embed', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { media: MediaRecord };
  const v = data.media.variants as { html?: string; provider?: string } | null;
  if (!v?.html) return null;
  return { html: v.html, provider: v.provider ?? '' };
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
          'prose prose-sm max-w-none min-h-[400px] rounded-md border border-border bg-surface p-4 text-ink focus:outline-none',
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const dt = event.dataTransfer;
        if (!dt || dt.files.length === 0) return false;
        const file = dt.files[0];
        if (!file) return false;
        if (file.type.startsWith('image/')) {
          event.preventDefault();
          void uploadImage(file).then((url) => {
            if (url) {
              const { schema } = view.state;
              const node = schema.nodes.image?.create({ src: url });
              if (node) {
                const tr = view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
              }
            }
          });
          return true;
        }
        if (file.type.startsWith('video/')) {
          event.preventDefault();
          void uploadVideoFile(file).then((result) => {
            if (result) {
              const { schema } = view.state;
              const node = schema.nodes.video?.create({
                src: result.src,
                ...(result.poster ? { poster: result.poster } : {}),
              });
              if (node) {
                const tr = view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
              }
            }
          });
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const dt = event.clipboardData;
        if (!dt || dt.files.length === 0) return false;
        const file = dt.files[0];
        if (!file) return false;
        if (file.type.startsWith('image/')) {
          event.preventDefault();
          void uploadImage(file).then((url) => {
            if (url) {
              const { schema } = view.state;
              const node = schema.nodes.image?.create({ src: url });
              if (node) {
                const tr = view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
              }
            }
          });
          return true;
        }
        return false;
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

  async function pickAndInsertImage() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      const url = await uploadImage(f);
      if (url && editor) editor.chain().focus().setImage({ src: url }).run();
    };
    inp.click();
  }

  const btn = (active: boolean, label: string, action: () => void) => (
    <button
      type="button"
      onClick={action}
      className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors no-tap-highlight ${
        active
          ? 'bg-primary border-primary text-on-primary'
          : 'border-border bg-surface text-ink hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
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
        {btn(false, 'Image', pickAndInsertImage)}
        {btn(false, 'YouTube', () => {
          const url = window.prompt('YouTube URL?');
          if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
        })}
        {btn(false, 'Video', () => {
          const inp = document.createElement('input');
          inp.type = 'file';
          inp.accept = 'video/*';
          inp.onchange = async () => {
            const f = inp.files?.[0];
            if (!f) return;
            const result = await uploadVideoFile(f);
            if (result && editor) {
              const node = editor.state.schema.nodes.video?.create({
                src: result.src,
                ...(result.poster ? { poster: result.poster } : {}),
              });
              if (node) {
                editor.chain().focus().insertContent(node.toJSON()).run();
              }
            }
          };
          inp.click();
        })}
        {btn(false, 'Embed', async () => {
          const url = window.prompt('Paste YouTube/TikTok/Facebook URL:');
          if (!url) return;
          const result = await createEmbedFromUrl(url);
          if (result && editor) {
            editor
              .chain()
              .focus()
              .insertContent({
                type: 'embed',
                attrs: { html: result.html, provider: result.provider },
              })
              .run();
          }
        })}
        {btn(false, 'Undo', () => editor.chain().focus().undo().run())}
        {btn(false, 'Redo', () => editor.chain().focus().redo().run())}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
