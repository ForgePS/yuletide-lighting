// @ts-nocheck — react-konva types are incompatible with React 19 JSX
'use client';

import { useState, useCallback } from 'react';
import type Konva from 'konva';
import { Stage, Layer, Line, Circle } from 'react-konva';
import { trpc } from '@/lib/trpc';

const PRESET_COLORS = [
  { value: '#FFD700', label: 'Gold' },
  { value: '#FF0000', label: 'Red' },
  { value: '#00FF00', label: 'Green' },
  { value: '#0000FF', label: 'Blue' },
  { value: '#FFFFFF', label: 'White' },
  { value: '#FF69B4', label: 'Pink' },
  { value: '#FFA500', label: 'Orange' },
];

type Point = { x: number; y: number };
type Strand = {
  id: string;
  points: Point[];
  color: string;
  bulbSize: number;
  spacing: number;
};

export default function MockupEditor() {
  const [propertyId, setPropertyId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [name, setName] = useState('Design v1');
  const [strands, setStrands] = useState<Strand[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedColor, setSelectedColor] = useState('#FFD700');
  const [brightness, setBrightness] = useState(0.5);
  const [drawMode, setDrawMode] = useState(false);

  const createMockup = trpc.mockups.create.useMutation();

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!drawMode) return;
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;

      if (currentPoints.length === 0) {
        setCurrentPoints([pos]);
      } else if (currentPoints.length === 1) {
        const newStrand: Strand = {
          id: crypto.randomUUID(),
          points: [currentPoints[0]!, pos],
          color: selectedColor,
          bulbSize: 6,
          spacing: 12,
        };
        setStrands([...strands, newStrand]);
        setCurrentPoints([]);
      }
    },
    [drawMode, currentPoints, selectedColor, strands],
  );

  function renderBulbs(strand: Strand) {
    const [p1, p2] = strand.points;
    if (!p1 || !p2) return null;
    const bulbs = [];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const count = Math.floor(dist / strand.spacing);

    for (let i = 0; i <= count; i++) {
      const t = count > 0 ? i / count : 0;
      bulbs.push(
        <Circle
          key={`${strand.id}-${i}`}
          x={p1.x + dx * t}
          y={p1.y + dy * t}
          radius={strand.bulbSize / 2}
          fill={strand.color}
          shadowBlur={4}
          shadowColor={strand.color}
        />,
      );
    }
    return bulbs;
  }

  async function handleSave() {
    if (!propertyId || !imageUrl) return;
    await createMockup.mutateAsync({
      propertyId,
      name,
      imageUrl,
      data: { backgroundBrightness: brightness, strands },
    });
    alert('Mockup saved!');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4">
        <input
          placeholder="Property ID"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <input
          placeholder="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <input
          placeholder="Mockup name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />

        <div>
          <label className="text-sm font-medium">Background brightness</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={brightness}
            onChange={(e) => setBrightness(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Light color</label>
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="input mt-2 w-full max-w-xs"
          >
            {PRESET_COLORS.map((color) => (
              <option key={color.value} value={color.value}>
                {color.label}
              </option>
            ))}
          </select>
          <span
            className="mt-2 inline-block h-8 w-8 rounded-full border-2 border-border"
            style={{ backgroundColor: selectedColor }}
            aria-hidden
          />
        </div>

        <button
          type="button"
          onClick={() => setDrawMode(!drawMode)}
          className={`w-full rounded-lg px-4 py-2 text-sm ${
            drawMode ? 'bg-primary text-primary-foreground' : 'border'
          }`}
        >
          {drawMode ? 'Drawing mode ON — click start & end points' : 'Enter draw mode'}
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm text-white"
        >
          Save mockup
        </button>
      </div>

      <div className="lg:col-span-2">
        <div className="relative overflow-hidden rounded-xl border">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt="Property"
                className="w-full"
                style={{ filter: `brightness(${brightness})` }}
              />
              <Stage
                width={800}
                height={600}
                onClick={handleStageClick}
                className="absolute inset-0"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              >
                <Layer>
                  {strands.map((strand) => (
                    <Line
                      key={strand.id}
                      points={strand.points.flatMap((p) => [p.x, p.y])}
                      stroke="transparent"
                    />
                  ))}
                  {strands.flatMap(renderBulbs)}
                  {currentPoints.length === 1 && currentPoints[0] && (
                    <Circle x={currentPoints[0].x} y={currentPoints[0].y} radius={4} fill="white" />
                  )}
                </Layer>
              </Stage>
            </>
          ) : (
            <div className="flex h-96 items-center justify-center bg-muted text-muted-foreground">
              Enter an image URL to begin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
