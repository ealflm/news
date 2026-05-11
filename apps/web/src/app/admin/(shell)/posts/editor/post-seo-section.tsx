'use client';

import { ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface Props {
  seoTitle: string;
  seoDesc: string;
  onSeoTitle: (v: string) => void;
  onSeoDesc: (v: string) => void;
}

export function PostSeoSection({ seoTitle, seoDesc, onSeoTitle, onSeoDesc }: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <details className="group">
        <summary className="flex h-11 cursor-pointer items-center gap-2 px-4 text-sm font-medium text-ink hover:bg-muted no-tap-highlight">
          <Search className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="flex-1">SEO</span>
          <ChevronDown
            className="h-4 w-4 text-muted-fg transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-3 border-t border-border p-4">
          <div className="space-y-1.5">
            <label htmlFor="seo-title" className="block text-xs font-medium text-ink">
              SEO title
            </label>
            <Input
              id="seo-title"
              value={seoTitle}
              onChange={(e) => onSeoTitle(e.target.value)}
              placeholder="Mặc định: tiêu đề bài viết"
            />
            <p className="text-[11px] text-muted-fg">
              Tối đa 60 ký tự để hiển thị đẹp trên Google. ({seoTitle.length}/60)
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="seo-desc" className="block text-xs font-medium text-ink">
              SEO description
            </label>
            <Textarea
              id="seo-desc"
              rows={3}
              value={seoDesc}
              onChange={(e) => onSeoDesc(e.target.value)}
              placeholder="Mô tả ngắn xuất hiện dưới tiêu đề"
            />
            <p className="text-[11px] text-muted-fg">
              Tối ưu 150-160 ký tự. ({seoDesc.length}/160)
            </p>
          </div>
        </div>
      </details>
    </Card>
  );
}
