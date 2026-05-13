# Sensitive Media (ảnh & video nhạy cảm) — Design

**Date:** 2026-05-13
**Status:** Draft

## Goal

Cho phép editor đánh dấu một ảnh inline / video / YouTube embed trong bài là "nhạy cảm". Trên public post page, các media nhạy cảm bị blur và phủ overlay text. Reader phải click vào overlay để hiện từng cái một.

Out of scope: cover image, embed bên thứ 3 (TikTok/Instagram), badge cấp post, ghi nhớ lựa chọn qua session.

## Behavior

- **Editor (admin):** chọn ảnh / video / YouTube → bubble menu hiện → toggle "Nhạy cảm". Ảnh đã đánh dấu hiển thị trong editor với viền đỏ và badge góc (không blur trong editor để admin xem được).
- **Public page:** mỗi media nhạy cảm bị blur (CSS), trên blur có overlay với text:
  - Ảnh: "Hình ảnh nhạy cảm, muốn xem thì nhấn vào?"
  - Video/YouTube: "Video nhạy cảm, muốn xem thì nhấn vào?"
- **Click overlay:** chỉ ảnh đó hiện rõ. Các media nhạy cảm khác trên cùng bài vẫn blur.
- **Persistence:** không nhớ lựa chọn qua reload — reload trang thì blur lại.
- **No-JS fallback:** blur vẫn hoạt động (CSS), click không có tác dụng (không có JS). Acceptable.

## Data model

Không cần migration. Cờ `sensitive: boolean` lưu trong attrs của node Tiptap, nằm sẵn trong `Post.contentJson` (JSON column hiện có). Default `false`.

Áp dụng cho 3 node:

| Node      | Source                             | Attrs sau khi extend         |
| --------- | ---------------------------------- | ---------------------------- |
| `image`   | `@tiptap/extension-image`          | `src, alt, title, sensitive` |
| `youtube` | `@tiptap/extension-youtube`        | `src, ..., sensitive`        |
| `video`   | custom (`tiptap-extensions.ts:67`) | `src, poster, sensitive`     |

Khi serialize ra HTML, attr này trở thành `data-sensitive="true"` trên thẻ gốc (`<img>` / `<iframe>` / `<video>`).

## Architecture

```
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│ Editor (Tiptap)    │    │ API: posts.service │    │ Public post page   │
│                    │    │                    │    │                    │
│ Bubble menu        │───▶│ renderTiptapToHtml │───▶│ contentHtml        │
│ toggle sensitive   │    │  → generateHTML    │    │ (đã wrap span)     │
│ (updateAttributes) │    │  → wrapSensitive   │    │                    │
│                    │    │                    │    │ + Client hydrator  │
│                    │    │ Lưu contentJson +  │    │ (click → reveal)   │
│                    │    │     contentHtml    │    │                    │
└────────────────────┘    └────────────────────┘    └────────────────────┘
```

Chỉ 4 unit thay đổi:

1. **Tiptap extension extend** (2 file song song: client editor + server render).
2. **Bubble menu component** trong editor.
3. **wrapSensitiveMedia()** post-process trong `renderTiptapToHtml`.
4. **Client hydrator** + CSS trên public page.

## Component breakdown

### 1. Tiptap extension extend (client + server)

**Files:**

- `apps/web/src/app/admin/(shell)/posts/editor/tiptap-extensions.ts`
- `packages/api/src/posts/tiptap-render.util.ts`

**Pattern:**

```ts
const SensitiveImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      sensitive: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-sensitive') === 'true',
        renderHTML: (attrs) => (attrs.sensitive ? { 'data-sensitive': 'true' } : {}),
      },
    };
  },
});
```

Áp dụng tương tự cho `Youtube`. Cho `Video` (custom node đã có), thêm field `sensitive` vào `addAttributes()` + `renderHTML()` của chính node đó.

**Đảm bảo:** hai file phải khai báo cùng attr — nếu lệch sẽ làm parse round-trip vỡ.

### 2. Bubble menu trong editor

**File:** `apps/web/src/app/admin/(shell)/posts/editor/tiptap-editor.tsx`

Dùng `BubbleMenu` từ `@tiptap/react/menus` (Tiptap 3.x). `shouldShow` callback trả `true` khi `editor.isActive('image') || editor.isActive('youtube') || editor.isActive('video')`.

Nội dung menu (1 button):

- Icon: `AlertTriangle` từ `lucide-react`.
- Label: "Nhạy cảm".
- Visual state: nếu node hiện tại `sensitive=true` → button có background đỏ nhạt (active).
- Action: lấy tên node hiện tại, chạy `editor.chain().focus().updateAttributes(name, { sensitive: !current }).run()`.

**Helper** để tìm node hiện tại + attrs: dựa trên `editor.state.selection` (NodeSelection cho atom blocks như image/youtube/video).

### 3. wrapSensitiveMedia() post-process

**File:** `packages/api/src/posts/tiptap-render.util.ts`

Thêm sau bước `generateHTML()` + post-process embed (sau dòng 131):

```ts
html = wrapSensitiveMedia(html);
```

```ts
function wrapSensitiveMedia(html: string): string {
  // Wrap <img data-sensitive="true">
  html = html.replace(/<img\b[^>]*\bdata-sensitive="true"[^>]*>/g, (match) =>
    buildWrapper(match, 'image', 'Hình ảnh nhạy cảm, muốn xem thì nhấn vào?'),
  );
  // Wrap <iframe ... data-sensitive="true" ...></iframe> (YouTube)
  html = html.replace(/<iframe\b[^>]*\bdata-sensitive="true"[^>]*>\s*<\/iframe>/g, (match) =>
    buildWrapper(match, 'video', 'Video nhạy cảm, muốn xem thì nhấn vào?'),
  );
  // Wrap <video ... data-sensitive="true" ...>...</video>
  html = html.replace(/<video\b[^>]*\bdata-sensitive="true"[^>]*>[\s\S]*?<\/video>/g, (match) =>
    buildWrapper(match, 'video', 'Video nhạy cảm, muốn xem thì nhấn vào?'),
  );
  return html;
}

function buildWrapper(inner: string, kind: 'image' | 'video', text: string): string {
  return (
    `<span class="sensitive-media" data-media="${kind}">` +
    inner +
    `<button type="button" class="sensitive-overlay" aria-label="${kind === 'image' ? 'Hiện hình ảnh nhạy cảm' : 'Hiện video nhạy cảm'}">` +
    `<span class="sensitive-overlay__text">${text}</span>` +
    `</button>` +
    `</span>`
  );
}
```

Regex chấp nhận được vì HTML là output của Tiptap (controlled). Pattern này khớp với cách đang post-process embed (dòng 121).

### 4. Public page: CSS + hydrator

**CSS** trong `apps/web/src/app/globals.css` (thêm khối mới, gần `.prose-news`):

```css
.prose-news .sensitive-media {
  position: relative;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  border-radius: 8px;
}

.prose-news .sensitive-media > img,
.prose-news .sensitive-media > iframe,
.prose-news .sensitive-media > video {
  filter: blur(28px);
  transform: scale(1.05);
  transition: filter 200ms ease;
  pointer-events: none;
}

.prose-news .sensitive-media.revealed > img,
.prose-news .sensitive-media.revealed > iframe,
.prose-news .sensitive-media.revealed > video {
  filter: none;
  transform: none;
  pointer-events: auto;
}

.prose-news .sensitive-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
  cursor: pointer;
  border: 0;
  padding: 0;
}

.prose-news .sensitive-overlay__text {
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  max-width: 80%;
  text-align: center;
}

.prose-news .sensitive-media.revealed .sensitive-overlay {
  display: none;
}

/* Editor preview state (admin) */
.ProseMirror img[data-sensitive='true'],
.ProseMirror iframe[data-sensitive='true'],
.ProseMirror video[data-sensitive='true'] {
  outline: 2px solid #ef4444;
  outline-offset: 2px;
  border-radius: 4px;
}
```

**Client hydrator** — file mới `apps/web/src/app/(site)/[year]/[month]/[day]/[slug]/sensitive-media-hydrator.tsx`:

```tsx
'use client';
import { useEffect } from 'react';

export function SensitiveMediaHydrator() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const wrapper = target.closest('.sensitive-media');
      if (!wrapper || wrapper.classList.contains('revealed')) return;
      e.preventDefault();
      wrapper.classList.add('revealed');
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
  return null;
}
```

Mount ngay sau `<div className="prose-news" ...>` trong `page.tsx`.

## Testing

- **Unit:** `renderTiptapToHtml.spec.ts` — input JSON có image sensitive / youtube sensitive / video sensitive / hỗn hợp → output có wrap span đúng `data-media` + overlay text đúng. Image/video không sensitive: KHÔNG wrap.
- **Manual E2E:**
  1. Tạo post, chèn 2 ảnh + 1 YouTube. Đánh dấu 1 ảnh + YouTube là nhạy cảm. Save.
  2. Mở public post page → ảnh 1 (sensitive) blur có overlay text "Hình ảnh nhạy cảm...", ảnh 2 rõ, YouTube blur có overlay text "Video nhạy cảm...".
  3. Click overlay ảnh → ảnh đó rõ, YouTube vẫn blur. Click overlay YouTube → cả hai rõ.
  4. Reload → cả hai blur lại.
  5. Quay lại editor → bubble menu trên ảnh sensitive hiện trạng thái active. Toggle off → save → public page hết blur.

## Risks

- **Regex post-process** sai pattern: mitigated bằng unit test cover các trường hợp (attr thứ tự khác nhau, self-closing tag, có/không class).
- **Tiptap parseHTML round-trip:** nếu user copy-paste HTML đã wrap (vd: từ public page về editor), Tiptap không nhận lại `<img>` bên trong `<span class="sensitive-media">`. Acceptable — editor flow là JSON, không phải HTML paste.
- **Iframe pointer-events:** YouTube iframe có thể có controls riêng — pointer-events: none đã chặn.
- **Two extension files lệch nhau:** lỗi này sẽ làm parseHTML server không nhận attr → silent data loss. Mitigation: viết test serialize round-trip ở server.
