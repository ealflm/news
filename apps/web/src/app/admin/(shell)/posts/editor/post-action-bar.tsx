'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft, Save, Globe2, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface Props {
  title: string;
  statusLabel: string | null;
  onSave: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  saving: boolean;
  canSave: boolean;
  publishing?: boolean;
  isPublished?: boolean;
}

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-fg',
  PUBLISHED: 'bg-success/10 text-success border border-success/30',
  SCHEDULED: 'bg-accent/10 text-accent border border-accent/30',
};

export function PostActionBar({
  title,
  statusLabel,
  onSave,
  onPublish,
  onUnpublish,
  saving,
  canSave,
  publishing,
  isPublished,
}: Props) {
  return (
    <div className="sticky top-0 z-30 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 mb-6 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href={'/admin/posts' as Route}
          className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-muted-fg hover:bg-muted hover:text-ink no-tap-highlight"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Bài viết
        </Link>
        <span aria-hidden="true" className="text-muted-fg">
          /
        </span>
        <span className="min-w-0 flex-1 truncate font-heading text-base font-semibold text-foreground">
          {title || 'Bài viết mới'}
        </span>
        {statusLabel && (
          <span
            className={cn(
              'inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold uppercase tracking-wide',
              statusStyles[statusLabel] ?? statusStyles.DRAFT,
            )}
          >
            {statusLabel}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            type="button"
            onClick={onSave}
            disabled={!canSave || saving}
            loading={saving}
            variant="secondary"
            size="sm"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isPublished ? 'Lưu thay đổi' : 'Lưu nháp'}
          </Button>
          {onPublish && !isPublished && (
            <Button type="button" onClick={onPublish} loading={publishing ?? false} size="sm">
              <Globe2 className="h-4 w-4" aria-hidden="true" />
              Xuất bản
            </Button>
          )}
          {onUnpublish && isPublished && (
            <Button
              type="button"
              onClick={onUnpublish}
              loading={publishing ?? false}
              variant="secondary"
              size="sm"
            >
              <EyeOff className="h-4 w-4" aria-hidden="true" />
              Bỏ xuất bản
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
