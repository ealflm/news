import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-ink',
          'placeholder:text-muted-fg',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-200',
          className,
        )}
        {...rest}
      />
    );
  },
);
