'use client';

import { useId, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface Props {
  /** Text shown when hover/focus. \n preserved. */
  text: string;
  /** aria-label for the trigger button (defaults to "Trợ giúp"). */
  label?: string;
  /** Side to anchor the tooltip on. Default top. */
  side?: 'top' | 'bottom';
}

/**
 * Small "?" affordance next to a form label. Click/hover/focus reveals the tip.
 * Accessible: trigger is a real button with aria-describedby pointing at tip,
 * keyboard focus also opens it, ESC closes.
 */
export function Tooltip({ text, label = 'Trợ giúp', side = 'top' }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  return (
    <span
      ref={ref as never}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-muted-fg hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 no-tap-highlight"
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 z-30 w-64 -translate-x-1/2 rounded-md border border-border bg-ink/95 px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg whitespace-pre-line ${
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {text}
        </span>
      )}
    </span>
  );
}

/**
 * Helper: render a `<label>` with a tooltip icon next to it.
 * Use as drop-in replacement for plain `<label>`.
 */
export function LabelWithHelp({
  htmlFor,
  children,
  tooltip,
  required,
  className = '',
}: {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink ${className}`}
    >
      <span>
        {children}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {tooltip && <Tooltip text={tooltip} />}
    </label>
  );
}
