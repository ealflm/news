'use client';

import { useEffect } from 'react';

interface Props {
  postId: string;
}

export function ViewTracker({ postId }: Props) {
  useEffect(() => {
    // Detect device + fb-in-app
    const ua = navigator.userAgent;
    const device = /iPhone|iPad|iPod/i.test(ua)
      ? 'ios'
      : /Android/i.test(ua)
        ? 'android'
        : 'desktop';
    const inFbApp = /FBAN|FBAV|FBIOS|FB_IAB|FB4A/i.test(ua);

    // Session id: try localStorage cuid-ish
    let sessionId: string | null = null;
    try {
      sessionId = localStorage.getItem('sid');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('sid', sessionId);
      }
    } catch {
      // ignore (private mode)
    }

    const payload = JSON.stringify({
      postId,
      device,
      inFbApp,
      referrer: document.referrer || undefined,
      sessionId: sessionId ?? undefined,
    });
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/view', blob);
      } else {
        void fetch('/api/analytics/view', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      // silent
    }
  }, [postId]);
  return null;
}
