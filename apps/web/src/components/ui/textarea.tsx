import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-ink',
        'placeholder:text-muted-fg',
        'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors duration-200',
        className,
      )}
      {...rest}
    />
  );
});
