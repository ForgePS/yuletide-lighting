'use client';

import type { BlockStyle, CmsBlock } from '@clcrm/types';

type Props = {
  style: BlockStyle | undefined;
  onChange: (style: BlockStyle) => void;
};

const DEFAULT_VIS = { desktop: true, tablet: true, mobile: true };

export function CmsBlockStyleEditor({ style, onChange }: Props) {
  const s: BlockStyle = style ?? {};
  const vis = s.visibility ?? DEFAULT_VIS;
  const pad = s.padding ?? {};

  function patch(partial: Partial<BlockStyle>) {
    onChange({ ...s, ...partial });
  }

  return (
    <details className="mt-3 rounded-lg border border-border bg-background/80 p-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Block style
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Width</span>
          <select
            className="w-full rounded border border-border px-2 py-1.5 text-sm"
            value={s.width ?? 'contained'}
            onChange={(e) =>
              patch({ width: e.target.value as NonNullable<BlockStyle['width']> })
            }
          >
            <option value="full">Full</option>
            <option value="wide">Wide</option>
            <option value="contained">Contained</option>
            <option value="narrow">Narrow</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Alignment</span>
          <select
            className="w-full rounded border border-border px-2 py-1.5 text-sm"
            value={s.alignment ?? 'left'}
            onChange={(e) =>
              patch({ alignment: e.target.value as NonNullable<BlockStyle['alignment']> })
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Background</span>
          <input
            className="w-full rounded border border-border px-2 py-1.5 text-sm"
            placeholder="#fff or css"
            value={s.background ?? ''}
            onChange={(e) => patch({ background: e.target.value || null })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Padding top</span>
          <input
            type="number"
            className="w-full rounded border border-border px-2 py-1.5 text-sm"
            value={pad.top ?? ''}
            onChange={(e) =>
              patch({
                padding: { ...pad, top: e.target.value === '' ? undefined : Number(e.target.value) },
              })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Padding bottom</span>
          <input
            type="number"
            className="w-full rounded border border-border px-2 py-1.5 text-sm"
            value={pad.bottom ?? ''}
            onChange={(e) =>
              patch({
                padding: {
                  ...pad,
                  bottom: e.target.value === '' ? undefined : Number(e.target.value),
                },
              })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">CSS class</span>
          <input
            className="w-full rounded border border-border px-2 py-1.5 text-sm"
            value={s.customClass ?? ''}
            onChange={(e) => patch({ customClass: e.target.value || undefined })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Element id</span>
          <input
            className="w-full rounded border border-border px-2 py-1.5 text-sm"
            value={s.customId ?? ''}
            onChange={(e) => patch({ customId: e.target.value || undefined })}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        {(['desktop', 'tablet', 'mobile'] as const).map((bp) => (
          <label key={bp} className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={vis[bp] !== false}
              onChange={(e) =>
                patch({ visibility: { ...DEFAULT_VIS, ...vis, [bp]: e.target.checked } })
              }
            />
            Show on {bp}
          </label>
        ))}
      </div>
    </details>
  );
}

export function applyBlockStyleToDraft(block: CmsBlock, style: BlockStyle): CmsBlock {
  return { ...block, style } as CmsBlock;
}
