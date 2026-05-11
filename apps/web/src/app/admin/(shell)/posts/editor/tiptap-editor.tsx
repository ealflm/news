'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { editorExtensions } from './tiptap-extensions';
import { ToolbarPopover } from './toolbar-popover';
import { EmojiPicker } from './emoji-picker';
import { MediaPicker, type MediaPickerResult } from './media-picker';
import { PromptDialog, type PromptConfig } from './prompt-dialog';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { MediaRecord } from '@news/shared';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { uploadMediaWithToast } from '@/components/ui/upload-toast';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Strikethrough,
  Underline as UnderlineIcon,
  Code,
  Code2,
  Link as LinkIcon,
  MonitorPlay as YoutubeIcon,
  Smile,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Palette,
  Type,
  Plus,
  Globe,
  CodeXml,
  Gamepad2,
  ChevronDown,
  RemoveFormatting,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  content: unknown;
  onChange: (json: unknown) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px'];
const FONT_FAMILIES = [
  { label: 'Mặc định', value: '' },
  { label: 'Sans', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, monospace' },
];
const TEXT_COLORS = [
  '#0F172A',
  '#E11D48',
  '#2563EB',
  '#16A34A',
  '#F59E0B',
  '#7C3AED',
  '#0891B2',
  '#64748B',
  '#FFFFFF',
];
const HIGHLIGHT_COLORS = [
  '#FEF08A',
  '#FBCFE8',
  '#BAE6FD',
  '#BBF7D0',
  '#FED7AA',
  '#DDD6FE',
  '#FECDD3',
  '#E2E8F0',
];

async function uploadImage(file: File): Promise<string | null> {
  const res = await uploadMediaWithToast(file);
  if (!res.ok || !res.media) return null;
  const m = res.media;
  if (m.variants && typeof m.variants === 'object') {
    const v = m.variants as Record<string, string>;
    const path = v['1280w'] ?? v['720w'] ?? v['320w'] ?? m.originalPath;
    return path ? `${API_URL}${path}` : null;
  }
  return m.originalPath ? `${API_URL}${m.originalPath}` : null;
}

async function uploadVideoFile(file: File): Promise<{ src: string; poster?: string } | null> {
  const res = await uploadMediaWithToast(file);
  if (!res.ok || !res.media) return null;
  const m = res.media;
  const v = (m.variants ?? null) as Record<string, string> | null;
  const src = v?.['720p']
    ? `${API_URL}${v['720p']}`
    : m.originalPath
      ? `${API_URL}${m.originalPath}`
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

/** Toolbar button: icon-based, supports active state */
function ToolBtn({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-ink transition-colors no-tap-highlight',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        active ? 'bg-primary text-on-primary' : 'hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-0.5 h-6 w-px bg-border" />;
}

export function TiptapEditor({ content, onChange }: Props) {
  const [libraryKind, setLibraryKind] = useState<'IMAGE' | 'VIDEO' | null>(null);
  const [pendingDropVideo, setPendingDropVideo] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
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
          'prose-news max-w-none min-h-[420px] rounded-b-md border border-t-0 border-border bg-surface px-4 py-3 text-ink focus:outline-none',
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
          // Stage the file and open confirm modal (handled at component level
          // because handleDrop must return synchronously).
          setPendingDropVideo(file);
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

  function handlePick(r: MediaPickerResult) {
    if (!editor) return;
    if (r.media.kind === 'IMAGE') {
      editor.chain().focus().setImage({ src: r.url }).run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'video',
          attrs: { src: r.url, ...(r.poster ? { poster: r.poster } : {}) },
        })
        .run();
    }
    setLibraryKind(null);
  }

  async function confirmDropVideoUpload() {
    if (!pendingDropVideo || !editor) return;
    const file = pendingDropVideo;
    setVideoUploading(true);
    const result = await uploadVideoFile(file);
    setVideoUploading(false);
    setPendingDropVideo(null);
    if (!result) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'video',
        attrs: { src: result.src, ...(result.poster ? { poster: result.poster } : {}) },
      })
      .run();
  }

  return (
    <div className="rounded-md">
      <Toolbar editor={editor} onOpenLibrary={(k) => setLibraryKind(k)} />
      <EditorContent editor={editor} />
      <MediaPicker
        open={libraryKind !== null}
        kind={libraryKind ?? 'IMAGE'}
        onClose={() => setLibraryKind(null)}
        onPick={handlePick}
      />
      <ConfirmDialog
        open={pendingDropVideo !== null}
        title="Upload video trực tiếp?"
        description={
          'Khuyến nghị: nên upload video lên YouTube rồi nhúng vào bài (Add → YouTube).\n\n' +
          'Cách này tiết kiệm dung lượng ổ đĩa và bandwidth của server, đặc biệt khi nhiều người xem cùng lúc.'
        }
        confirmLabel="Vẫn upload"
        cancelLabel="Hủy"
        busy={videoUploading}
        onCancel={() => setPendingDropVideo(null)}
        onConfirm={() => void confirmDropVideoUpload()}
      />
    </div>
  );
}

function Toolbar({
  editor,
  onOpenLibrary,
}: {
  editor: Editor;
  onOpenLibrary: (kind: 'IMAGE' | 'VIDEO') => void;
}) {
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null);

  /* ------ helpers ------ */
  function addEmbedFromUrlPrompt() {
    setPromptConfig({
      title: 'Embed URL',
      description: 'Dán URL của TikTok / YouTube / Facebook / Spotify.',
      placeholder: 'https://...',
      submitLabel: 'Chèn',
      onSubmit: async (raw) => {
        const url = raw.trim();
        if (!url) return false;
        const r = await createEmbedFromUrl(url);
        if (!r) {
          toast.error('Không lấy được embed từ URL này.');
          return false;
        }
        editor
          .chain()
          .focus()
          .insertContent({ type: 'embed', attrs: { html: r.html, provider: r.provider } })
          .run();
      },
    });
  }

  function addRawHtmlPrompt() {
    setPromptConfig({
      title: 'HTML',
      description: 'Dán snippet HTML (iframe / table / widget).',
      placeholder: '<iframe src="..." width="600" height="400"></iframe>',
      multiline: true,
      submitLabel: 'Chèn',
      onSubmit: (raw) => {
        const html = raw.trim();
        if (!html) return false;
        editor
          .chain()
          .focus()
          .insertContent({ type: 'embed', attrs: { html, provider: 'raw' } })
          .run();
      },
    });
  }

  function addIframeEmbedPrompt() {
    setPromptConfig({
      title: 'Game / iFrame',
      description:
        'Dán URL hoặc <iframe> snippet.\n' +
        'VD URL: https://poki.com/en/g/your-game\n' +
        'VD snippet: <iframe src="..." width="800" height="600"></iframe>',
      placeholder: 'https://... hoặc <iframe ...>',
      multiline: true,
      submitLabel: 'Chèn',
      onSubmit: (raw) => {
        const trimmed = raw.trim();
        if (!trimmed) return false;
        let html: string;
        if (/<iframe[\s>]/i.test(trimmed)) {
          html = trimmed;
        } else if (/^https?:\/\//i.test(trimmed)) {
          const escaped = trimmed.replace(/"/g, '&quot;');
          html = `<div class="iframe-wrap" style="position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:8px;background:#000;"><iframe src="${escaped}" allowfullscreen allow="autoplay; fullscreen; gamepad; clipboard-write; encrypted-media" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe></div>`;
        } else {
          toast.error('Cần URL bắt đầu bằng http(s):// hoặc thẻ <iframe>…');
          return false;
        }
        editor
          .chain()
          .focus()
          .insertContent({ type: 'embed', attrs: { html, provider: 'iframe' } })
          .run();
      },
    });
  }

  function addYoutubePrompt() {
    setPromptConfig({
      title: 'Nhúng YouTube',
      description: 'Dán URL video YouTube.',
      placeholder: 'https://www.youtube.com/watch?v=...',
      submitLabel: 'Chèn',
      onSubmit: (raw) => {
        const url = raw.trim();
        if (!url) return false;
        editor.chain().focus().setYoutubeVideo({ src: url }).run();
      },
    });
  }

  function setLinkPrompt() {
    const prev = editor.getAttributes('link').href as string | undefined;
    setPromptConfig({
      title: editor.isActive('link') ? 'Sửa link' : 'Thêm link',
      description: 'Để trống và bấm Lưu để gỡ link.',
      placeholder: 'https://...',
      initialValue: prev ?? 'https://',
      submitLabel: 'Lưu',
      onSubmit: (raw) => {
        const url = raw.trim();
        if (url === '' || url === 'https://') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
      },
    });
  }

  /* ------ active state derivations ------ */
  const headingLevel =
    [1, 2, 3, 4].find((lvl) => editor.isActive('heading', { level: lvl })) ?? null;
  const headingLabel = headingLevel ? `H${headingLevel}` : 'P';
  const headingIcon =
    headingLevel === 1 ? (
      <Heading1 className="h-4 w-4" />
    ) : headingLevel === 2 ? (
      <Heading2 className="h-4 w-4" />
    ) : headingLevel === 3 ? (
      <Heading3 className="h-4 w-4" />
    ) : headingLevel === 4 ? (
      <Heading4 className="h-4 w-4" />
    ) : (
      <Pilcrow className="h-4 w-4" />
    );

  const listActive =
    editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList');
  const listIcon = editor.isActive('orderedList') ? (
    <ListOrdered className="h-4 w-4" />
  ) : editor.isActive('taskList') ? (
    <ListChecks className="h-4 w-4" />
  ) : (
    <List className="h-4 w-4" />
  );

  const alignIcon = editor.isActive({ textAlign: 'center' }) ? (
    <AlignCenter className="h-4 w-4" />
  ) : editor.isActive({ textAlign: 'right' }) ? (
    <AlignRight className="h-4 w-4" />
  ) : editor.isActive({ textAlign: 'justify' }) ? (
    <AlignJustify className="h-4 w-4" />
  ) : (
    <AlignLeft className="h-4 w-4" />
  );

  const currentColor = (editor.getAttributes('textStyle').color as string) || '#0F172A';
  const currentFontSize = (editor.getAttributes('textStyle').fontSize as string) || '';

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 border-border bg-bg/60 px-2 py-1.5">
      {/* Undo / Redo */}
      <ToolBtn
        title="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo2 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo2 className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      {/* Heading dropdown */}
      <ToolbarPopover
        trigger={(open) => (
          <span
            className={cn(
              'flex h-8 items-center gap-0.5 rounded-md px-2 text-ink transition-colors no-tap-highlight',
              headingLevel ? 'bg-primary text-on-primary' : 'hover:bg-muted',
              open && 'bg-muted',
            )}
            title="Tiêu đề"
          >
            {headingIcon}
            <ChevronDown className="h-3 w-3" />
          </span>
        )}
      >
        {(close) => (
          <>
            {[
              { label: 'Đoạn văn', icon: <Pilcrow className="h-4 w-4" />, level: 0 },
              { label: 'Heading 1', icon: <Heading1 className="h-4 w-4" />, level: 1 },
              { label: 'Heading 2', icon: <Heading2 className="h-4 w-4" />, level: 2 },
              { label: 'Heading 3', icon: <Heading3 className="h-4 w-4" />, level: 3 },
              { label: 'Heading 4', icon: <Heading4 className="h-4 w-4" />, level: 4 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (item.level === 0) {
                    editor.chain().focus().setParagraph().run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .toggleHeading({ level: item.level as 1 | 2 | 3 | 4 })
                      .run();
                  }
                  close();
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted',
                  (item.level === 0 && !headingLevel) || headingLevel === item.level
                    ? 'text-primary font-medium'
                    : 'text-ink',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </>
        )}
      </ToolbarPopover>

      {/* List dropdown */}
      <ToolbarPopover
        trigger={(open) => (
          <span
            className={cn(
              'flex h-8 items-center gap-0.5 rounded-md px-2 text-ink transition-colors no-tap-highlight',
              listActive ? 'bg-primary text-on-primary' : 'hover:bg-muted',
              open && 'bg-muted',
            )}
            title="Danh sách"
          >
            {listIcon}
            <ChevronDown className="h-3 w-3" />
          </span>
        )}
      >
        {(close) => (
          <>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleBulletList().run();
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            >
              <List className="h-4 w-4" /> Bullet list
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleOrderedList().run();
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            >
              <ListOrdered className="h-4 w-4" /> Đánh số
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().toggleTaskList().run();
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            >
              <ListChecks className="h-4 w-4" /> Task list
            </button>
          </>
        )}
      </ToolbarPopover>

      {/* Blockquote */}
      <ToolBtn
        title="Trích dẫn"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolBtn>

      {/* Emoji */}
      <ToolbarPopover
        trigger={(open) => (
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md text-ink transition-colors no-tap-highlight',
              open ? 'bg-muted' : 'hover:bg-muted',
            )}
            title="Emoji"
          >
            <Smile className="h-4 w-4" />
          </span>
        )}
        contentClassName="p-0"
      >
        {(close) => (
          <EmojiPicker
            onPick={(e) => {
              editor.chain().focus().insertContent(e).run();
              close();
            }}
          />
        )}
      </ToolbarPopover>

      <Divider />

      {/* Inline marks */}
      <ToolBtn
        title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Strikethrough"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Underline"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Inline code"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Code block"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn title="Link" active={editor.isActive('link')} onClick={setLinkPrompt}>
        <LinkIcon className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      {/* Highlight color */}
      <ToolbarPopover
        trigger={(open) => (
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md text-ink transition-colors no-tap-highlight',
              editor.isActive('highlight') ? 'bg-primary text-on-primary' : 'hover:bg-muted',
              open && 'bg-muted',
            )}
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </span>
        )}
      >
        {(close) => (
          <>
            <div className="grid grid-cols-4 gap-1 p-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color: c }).run();
                    close();
                  }}
                  className="h-7 w-7 rounded-sm border border-border hover:scale-110 transition-transform"
                  style={{ background: c }}
                  title={c}
                  aria-label={`Highlight ${c}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-fg hover:bg-muted"
            >
              <RemoveFormatting className="h-3.5 w-3.5" /> Bỏ highlight
            </button>
          </>
        )}
      </ToolbarPopover>

      {/* Text color */}
      <ToolbarPopover
        trigger={(open) => (
          <span
            className={cn(
              'relative flex h-8 w-8 items-center justify-center rounded-md text-ink transition-colors no-tap-highlight',
              open ? 'bg-muted' : 'hover:bg-muted',
            )}
            title="Màu chữ"
          >
            <Palette className="h-4 w-4" />
            <span
              className="absolute bottom-1 left-1.5 right-1.5 h-0.5 rounded"
              style={{ background: currentColor }}
            />
          </span>
        )}
      >
        {(close) => (
          <>
            <div className="grid grid-cols-3 gap-1 p-1">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setColor(c).run();
                    close();
                  }}
                  className="flex h-8 items-center justify-center rounded-sm border border-border text-xs font-bold hover:scale-105 transition-transform"
                  style={{ color: c, background: c === '#FFFFFF' ? '#F1F5F9' : 'transparent' }}
                  title={c}
                  aria-label={`Color ${c}`}
                >
                  A
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-fg hover:bg-muted"
            >
              <RemoveFormatting className="h-3.5 w-3.5" /> Bỏ màu
            </button>
          </>
        )}
      </ToolbarPopover>

      {/* Font size */}
      <ToolbarPopover
        trigger={(open) => (
          <span
            className={cn(
              'flex h-8 items-center gap-0.5 rounded-md px-2 text-ink transition-colors no-tap-highlight',
              open ? 'bg-muted' : 'hover:bg-muted',
            )}
            title="Kích cỡ chữ"
          >
            <Type className="h-4 w-4" />
            <span className="text-[10px] font-medium tabular-nums">
              {currentFontSize.replace('px', '') || 'auto'}
            </span>
            <ChevronDown className="h-3 w-3" />
          </span>
        )}
      >
        {(close) => (
          <>
            {FONT_SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => {
                  (
                    editor.chain().focus() as unknown as {
                      setFontSize: (s: string) => { run: () => void };
                    }
                  )
                    .setFontSize(sz)
                    .run();
                  close();
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-sm px-2 py-1 text-sm hover:bg-muted',
                  currentFontSize === sz ? 'text-primary font-medium' : 'text-ink',
                )}
              >
                <span style={{ fontSize: sz }}>Aa</span>
                <span className="text-xs text-muted-fg">{sz}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                (editor.chain().focus() as unknown as { unsetFontSize: () => { run: () => void } })
                  .unsetFontSize()
                  .run();
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-fg hover:bg-muted"
            >
              <RemoveFormatting className="h-3.5 w-3.5" /> Mặc định
            </button>
          </>
        )}
      </ToolbarPopover>

      {/* Font family */}
      <ToolbarPopover
        trigger={(open) => (
          <span
            className={cn(
              'flex h-8 items-center gap-0.5 rounded-md px-2 text-ink transition-colors no-tap-highlight',
              open ? 'bg-muted' : 'hover:bg-muted',
            )}
            title="Phông chữ"
          >
            <Globe className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </span>
        )}
      >
        {(close) => (
          <>
            {FONT_FAMILIES.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => {
                  if (f.value) editor.chain().focus().setFontFamily(f.value).run();
                  else editor.chain().focus().unsetFontFamily().run();
                  close();
                }}
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted text-ink"
                style={f.value ? { fontFamily: f.value } : undefined}
              >
                {f.label}
              </button>
            ))}
          </>
        )}
      </ToolbarPopover>

      <Divider />

      {/* Superscript / Subscript */}
      <ToolBtn
        title="Superscript"
        active={editor.isActive('superscript')}
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
      >
        <SuperscriptIcon className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Subscript"
        active={editor.isActive('subscript')}
        onClick={() => editor.chain().focus().toggleSubscript().run()}
      >
        <SubscriptIcon className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      {/* Alignment */}
      <ToolBtn
        title="Căn trái"
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Căn giữa"
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Căn phải"
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn
        title="Đều hai bên"
        active={editor.isActive({ textAlign: 'justify' })}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        <AlignJustify className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      {/* Clear formatting */}
      <ToolBtn
        title="Xóa định dạng"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <RemoveFormatting className="h-4 w-4" />
      </ToolBtn>

      {/* HR */}
      <ToolBtn
        title="Đường kẻ ngang"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </ToolBtn>

      <Divider />

      {/* Add menu (image / video / youtube / embed / html) */}
      <ToolbarPopover
        align="end"
        trigger={(open) => (
          <span
            className={cn(
              'flex h-8 items-center gap-1 rounded-md bg-accent px-3 text-on-accent transition-colors no-tap-highlight hover:bg-accent/90',
              open && 'bg-accent/90',
            )}
            title="Thêm media / embed"
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs font-medium">Add</span>
          </span>
        )}
      >
        {(close) => (
          <>
            <button
              type="button"
              onClick={() => {
                onOpenLibrary('IMAGE');
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            >
              <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-left">Ảnh từ thư viện</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenLibrary('VIDEO');
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            >
              <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-left">Video từ thư viện</span>
            </button>
            <div className="my-1 h-px bg-border" role="separator" aria-hidden="true" />
            <button
              type="button"
              onClick={() => {
                addYoutubePrompt();
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            >
              <YoutubeIcon className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-left">YouTube</span>
            </button>
            <button
              type="button"
              onClick={() => {
                addEmbedFromUrlPrompt();
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Globe className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-left">Embed URL (TikTok/FB/Spotify)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                addIframeEmbedPrompt();
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Gamepad2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-left">Game / iFrame</span>
            </button>
            <button
              type="button"
              onClick={() => {
                addRawHtmlPrompt();
                close();
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            >
              <CodeXml className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-left">HTML</span>
            </button>
          </>
        )}
      </ToolbarPopover>

      <span className="hidden lg:inline ml-auto text-[10px] text-muted-fg">{alignIcon}</span>

      <PromptDialog config={promptConfig} onClose={() => setPromptConfig(null)} />
    </div>
  );
}
