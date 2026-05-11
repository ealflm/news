'use client';

import { ChevronDown, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { AdminPopup, OverrideAction } from '@news/shared';
import { cn } from '@/lib/cn';

interface Props {
  popups: AdminPopup[];
  overrides: { popupId: string; action: OverrideAction }[];
  onChange: (overrides: { popupId: string; action: OverrideAction }[]) => void;
}

export function PostPopupOverrides({ popups, overrides, onChange }: Props) {
  if (popups.length === 0) return null;

  function getAction(popupId: string): OverrideAction | null {
    return overrides.find((o) => o.popupId === popupId)?.action ?? null;
  }

  function setAction(popupId: string, action: OverrideAction | null) {
    const without = overrides.filter((o) => o.popupId !== popupId);
    onChange(action === null ? without : [...without, { popupId, action }]);
  }

  return (
    <Card className="overflow-hidden p-0">
      <details className="group">
        <summary className="flex h-11 cursor-pointer items-center gap-2 px-4 text-sm font-medium text-ink hover:bg-muted no-tap-highlight">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="flex-1">Popup overrides</span>
          {overrides.length > 0 && (
            <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-[11px] font-semibold text-primary">
              {overrides.length}
            </span>
          )}
          <ChevronDown
            className="h-4 w-4 text-muted-fg transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <ul className="divide-y divide-border border-t border-border">
          {popups.map((p) => {
            const action = getAction(p.id);
            return (
              <li key={p.id} className="flex items-center gap-2 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink">{p.name}</p>
                  {p.isGlobal && <p className="text-[11px] text-muted-fg">Global</p>}
                </div>
                <div className="inline-flex overflow-hidden rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setAction(p.id, null)}
                    className={cn(
                      'h-7 px-2 text-[11px] font-medium no-tap-highlight',
                      !action ? 'bg-muted text-ink' : 'text-muted-fg hover:bg-muted',
                    )}
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction(p.id, 'ATTACH')}
                    className={cn(
                      'h-7 border-l border-border px-2 text-[11px] font-medium no-tap-highlight',
                      action === 'ATTACH'
                        ? 'bg-success/10 text-success'
                        : 'text-muted-fg hover:bg-muted',
                    )}
                  >
                    Attach
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction(p.id, 'DETACH')}
                    className={cn(
                      'h-7 border-l border-border px-2 text-[11px] font-medium no-tap-highlight',
                      action === 'DETACH'
                        ? 'bg-destructive/10 text-destructive'
                        : 'text-muted-fg hover:bg-muted',
                    )}
                  >
                    Detach
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </details>
    </Card>
  );
}
