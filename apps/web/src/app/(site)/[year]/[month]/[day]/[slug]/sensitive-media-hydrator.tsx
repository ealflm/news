'use client';

import { useEffect } from 'react';

/**
 * Reveals a single sensitive media wrapper on click. The server has already
 * rendered `<span class="sensitive-media">` around each blurred element, so we
 * only need to add `.revealed` when the user clicks the overlay.
 */
export function SensitiveMediaHydrator() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const wrapper = target.closest('.sensitive-media');
      if (!wrapper || wrapper.classList.contains('revealed')) return;
      e.preventDefault();
      wrapper.classList.add('revealed');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
