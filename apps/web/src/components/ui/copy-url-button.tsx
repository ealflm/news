'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  path: string;
  className?: string;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function CopyUrlButton({
  path,
  className,
  label = 'Sao chép URL',
  showLabel = false,
  size = 'md',
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Đã sao chép URL');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Không thể sao chép URL');
    }
  }

  const Icon = copied ? Check : Copy;
  const sizeClass = size === 'sm' ? 'h-8' : 'h-9';
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:border-border-strong hover:bg-muted no-tap-highlight',
        sizeClass,
        !showLabel && (size === 'sm' ? 'w-8 px-0 justify-center' : 'w-9 px-0 justify-center'),
        className,
      )}
    >
      <Icon className={cn(iconClass, copied && 'text-success')} aria-hidden="true" />
      {showLabel && <span>{copied ? 'Đã sao chép' : label}</span>}
    </button>
  );
}
