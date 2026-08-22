// @ts-nocheck — react-konva types are incompatible with React 19 JSX
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import { Stage, Layer, Line, Circle } from 'react-konva';
import type { MockupStrand } from '@clcrm/types';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { LightingLayerToolbar, strandFromPreset } from './lighting-layer-toolbar';

type Point = { x: number; y: number };

type MockupCanvasProps = {
  imageUrl: string;
  strands: MockupStrand[];
  brightness: number;
  onStrandsChange: (strands: MockupStrand[]) => void;
  onBrightnessChange: (value: number) => void;
  onSave: () => void;
  saving?: boolean;
};

export function MockupCanvas({
  imageUrl,
  strands,
  brightness,
  onStrandsChange,
  onBrightnessChange,
  onSave,
  saving,
}: MockupCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [presetId, setPresetId] = useState('roofline');
  const [selectedColor, setSelectedColor] = useState('#FFD700');
  const [drawMode, setDrawMode] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [visibleLayerTypes, setVisibleLayerTypes] = useState<Record<string, boolean>>({
    lighting: true,
    trees: true,
    decorations: true,
    commercial: true,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setStageSize({ width: el.clientWidth, height: Math.round(el.clientWidth * 0.75) });
    });
    ro.observe(el);
    setStageSize({ width: el.clientWidth, height: Math.round(el.clientWidth * 0.75) });
    return () => ro.disconnect();
  }, []);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!drawMode) return;
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;

      if (currentPoints.length === 0) {
        setCurrentPoints([pos]);
      } else if (currentPoints.length === 1) {
        const newStrand = strandFromPreset([currentPoints[0]!, pos], presetId, selectedColor);
        onStrandsChange([...strands, newStrand]);
        setCurrentPoints([]);
      }
    },
    [drawMode, currentPoints, presetId, selectedColor, strands, onStrandsChange],
  );

  function renderBulbs(strand: MockupStrand) {
    if (strand.points.length < 2) return null;
    const layerType = strand.layerType ?? 'lighting';
    if (!visibleLayerTypes[layerType]) return null;
    const bulbs = [];
    const glow = layerType === 'commercial' ? 10 : layerType === 'decorations' ? 8 : 6;
    const radiusBoost = layerType === 'commercial' ? 1.8 : layerType === 'decorations' ? 1.3 : 1;
    for (let i = 0; i < strand.points.length - 1; i++) {
      const p1 = strand.points[i]!;
      const p2 = strand.points[i + 1]!;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const count = Math.floor(dist / strand.spacing);
      for (let j = 0; j <= count; j++) {
        const t = count > 0 ? j / count : 0;
        bulbs.push(
          <Circle
            key={`${strand.id}-${i}-${j}`}
            x={p1.x + dx * t}
            y={p1.y + dy * t}
            radius={(strand.bulbSize / 2) * radiusBoost}
            fill={strand.color}
            shadowBlur={glow}
            shadowColor={strand.color}
          />,
        );
      }
    }
    return bulbs;
  }

  const visibleStrands = strands.filter((strand) => visibleLayerTypes[strand.layerType ?? 'lighting']);

  return (
    <div className="space-y-4">
      <LightingLayerToolbar
        presetId={presetId}
        color={selectedColor}
        drawMode={drawMode}
        onPresetChange={setPresetId}
        onColorChange={setSelectedColor}
        onDrawModeToggle={() => setDrawMode((v) => !v)}
        onUndo={() => onStrandsChange(strands.slice(0, -1))}
        onSave={onSave}
        saving={saving}
      />

      <div>
        <p className="mb-2 text-sm font-medium">Layer visibility</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {(['lighting', 'trees', 'decorations', 'commercial'] as const).map((layerType) => (
            <button
              key={layerType}
              type="button"
              className={visibleLayerTypes[layerType] ? 'btn-primary text-xs capitalize' : 'btn-secondary text-xs capitalize'}
              onClick={() => setVisibleLayerTypes((prev) => ({ ...prev, [layerType]: !prev[layerType] }))}
            >
              {layerType}
            </button>
          ))}
        </div>
        <label className="text-sm font-medium">Photo brightness</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={brightness}
          onChange={(e) => onBrightnessChange(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <div ref={containerRef} className="relative overflow-hidden rounded-xl border">
        <AuthenticatedImage
          value={imageUrl}
          alt="Property"
          className="w-full"
          style={{ filter: `brightness(${brightness})` }}
          fallback={<div className="aspect-[4/3] bg-muted" />}
        />
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          onClick={handleStageClick}
          className="absolute inset-0"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        >
          <Layer>
            {visibleStrands.map((strand) => (
              <Line
                key={strand.id}
                points={strand.points.flatMap((p) => [p.x, p.y])}
                stroke={strand.color}
                strokeWidth={strand.layerType === 'commercial' ? 3 : strand.layerType === 'decorations' ? 2.5 : 1.5}
                dash={strand.layerType === 'decorations' ? [6, 4] : undefined}
                opacity={0.35}
              />
            ))}
            {visibleStrands.flatMap(renderBulbs)}
            {currentPoints.length === 1 && currentPoints[0] && (
              <Circle x={currentPoints[0].x} y={currentPoints[0].y} radius={4} fill="white" />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
