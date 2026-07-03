'use client';

import type { LightType, MockupStrand } from '@clcrm/types';

export const COLOR_THEMES = [
  { id: 'warm_white', name: 'Warm white', color: '#FFD700' },
  { id: 'cool_white', name: 'Cool white', color: '#F5F5F5' },
  { id: 'red', name: 'Red', color: '#FF0000' },
  { id: 'green', name: 'Green', color: '#00AA44' },
  { id: 'blue', name: 'Blue', color: '#0066FF' },
  { id: 'multicolor', name: 'Multicolor', color: '#FF6600' },
  { id: 'candy_cane', name: 'Candy cane', color: '#FF0000' },
];

export const LAYER_PRESETS: Array<{
  id: string;
  label: string;
  lightType: LightType;
  bulbSize: number;
  spacing: number;
  layerType: string;
}> = [
  { id: 'roofline', label: 'C9 roofline', lightType: 'c9', bulbSize: 6, spacing: 12, layerType: 'lighting' },
  { id: 'mini', label: 'Mini lights', lightType: 'mini', bulbSize: 3, spacing: 6, layerType: 'lighting' },
  { id: 'tree_wrap', label: 'Tree wrap', lightType: 'mini', bulbSize: 4, spacing: 8, layerType: 'trees' },
  { id: 'garland', label: 'Garland', lightType: 'c9', bulbSize: 5, spacing: 10, layerType: 'decorations' },
  { id: 'wreath', label: 'Wreath accent', lightType: 'c9', bulbSize: 5, spacing: 8, layerType: 'decorations' },
  { id: 'commercial', label: 'Commercial', lightType: 'c9', bulbSize: 8, spacing: 6, layerType: 'commercial' },
];

type LightingLayerToolbarProps = {
  presetId: string;
  color: string;
  drawMode: boolean;
  onPresetChange: (id: string) => void;
  onColorChange: (color: string) => void;
  onDrawModeToggle: () => void;
  onUndo?: () => void;
  onSave?: () => void;
  saving?: boolean;
};

export function LightingLayerToolbar({
  presetId,
  color,
  drawMode,
  onPresetChange,
  onColorChange,
  onDrawModeToggle,
  onUndo,
  onSave,
  saving,
}: LightingLayerToolbarProps) {
  return (
    <div className="card space-y-4 p-4">
      <h3 className="text-sm font-semibold">Lighting layers</h3>
      <div className="flex flex-wrap gap-2">
        {LAYER_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={presetId === p.id ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
            onClick={() => onPresetChange(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Color theme</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.name}
              className={`h-8 w-8 rounded-full border-2 ${color === t.color ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
              style={{ backgroundColor: t.color }}
              onClick={() => onColorChange(t.color)}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={drawMode ? 'btn-primary text-sm' : 'btn-secondary text-sm'} onClick={onDrawModeToggle}>
          {drawMode ? 'Drawing…' : 'Draw lights'}
        </button>
        {onUndo && (
          <button type="button" className="btn-secondary text-sm" onClick={onUndo}>Undo</button>
        )}
        {onSave && (
          <button type="button" className="btn-primary text-sm" disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save strands'}
          </button>
        )}
      </div>
      {drawMode && (
        <p className="text-xs text-muted-foreground">Click start point, then end point on the photo to add a light run.</p>
      )}
    </div>
  );
}

export function strandFromPreset(
  points: MockupStrand['points'],
  presetId: string,
  color: string,
): MockupStrand {
  const preset = LAYER_PRESETS.find((p) => p.id === presetId) ?? LAYER_PRESETS[0]!;
  return {
    id: crypto.randomUUID(),
    points,
    color,
    lightType: preset.lightType,
    pattern: 'solid',
    bulbSize: preset.bulbSize,
    spacing: preset.spacing,
    brightness: 1,
  };
}
