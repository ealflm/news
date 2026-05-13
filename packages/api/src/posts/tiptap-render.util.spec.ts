import { describe, expect, it } from 'vitest';
import { renderTiptapToHtml, wrapSensitiveMedia } from './tiptap-render.util';

describe('wrapSensitiveMedia', () => {
  it('wraps a sensitive <img> with the image overlay', () => {
    const html = '<p><img src="/a.jpg" data-sensitive="true" alt="x"></p>';
    const out = wrapSensitiveMedia(html);
    expect(out).toContain('<span class="sensitive-media" data-media="image">');
    expect(out).toContain('<img src="/a.jpg" data-sensitive="true" alt="x">');
    expect(out).toContain('Hình ảnh nhạy cảm, muốn xem thì nhấn vào?');
    expect(out).toContain('aria-label="Hiện hình ảnh nhạy cảm"');
  });

  it('wraps a sensitive <iframe> (YouTube) with the video overlay', () => {
    const html = '<iframe src="https://www.youtube.com/embed/x" data-sensitive="true"></iframe>';
    const out = wrapSensitiveMedia(html);
    expect(out).toContain('<span class="sensitive-media" data-media="video">');
    expect(out).toContain('Video nhạy cảm, muốn xem thì nhấn vào?');
  });

  it('wraps a sensitive <video> with the video overlay', () => {
    const html = '<video src="/v.mp4" data-sensitive="true" controls></video>';
    const out = wrapSensitiveMedia(html);
    expect(out).toContain('<span class="sensitive-media" data-media="video">');
    expect(out).toContain('Video nhạy cảm');
  });

  it('leaves non-sensitive media untouched', () => {
    const html = '<img src="/a.jpg"><iframe src="x"></iframe><video src="/v.mp4"></video>';
    expect(wrapSensitiveMedia(html)).toBe(html);
  });

  it('handles multiple sensitive media in the same html', () => {
    const html =
      '<img src="/a" data-sensitive="true">' +
      '<img src="/b">' +
      '<video src="/v" data-sensitive="true"></video>';
    const out = wrapSensitiveMedia(html);
    expect((out.match(/sensitive-media/g) ?? []).length).toBe(2);
    expect(out).toContain('<img src="/b">');
  });
});

describe('renderTiptapToHtml (sensitive)', () => {
  it('renders contentHtml with sensitive wrapper from a Tiptap doc', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'before ' }],
        },
        {
          type: 'image',
          attrs: { src: '/sensitive.jpg', sensitive: true },
        },
        {
          type: 'image',
          attrs: { src: '/normal.jpg' },
        },
      ],
    };
    const html = renderTiptapToHtml(doc);
    expect(html).toContain('<span class="sensitive-media" data-media="image">');
    expect(html).toContain('data-sensitive="true"');
    expect(html).toContain('src="/sensitive.jpg"');
    // The non-sensitive image must NOT be wrapped.
    const wrapperCount = (html.match(/sensitive-media/g) ?? []).length;
    expect(wrapperCount).toBe(1);
    expect(html).toContain('src="/normal.jpg"');
  });
});
