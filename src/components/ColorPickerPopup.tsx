import React, { useState, useEffect, useRef } from 'react';
import { Pipette } from 'lucide-react';

interface ColorPickerPopupProps {
  color: string; // Hex string e.g. '#00f0ff'
  onChange: (hex: string) => void;
  onClose?: () => void;
}

// Color conversion helpers
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0, g: 194, b: 255 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return `#${((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1)}`;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h = 0;
  if (diff !== 0) {
    if (max === r) h = ((g - b) / diff) % 6;
    else if (max === g) h = (b - r) / diff + 2;
    else h = (r - g) / diff + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : Math.round((diff / max) * 100);
  const v = Math.round(max * 100);
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

export default function ColorPickerPopup({ color, onChange, onClose }: ColorPickerPopupProps) {
  const initialRgb = hexToRgb(color || '#00c2ff');
  const initialHsv = rgbToHsv(initialRgb.r, initialRgb.g, initialRgb.b);

  const [hsv, setHsv] = useState(initialHsv);
  const [rgb, setRgb] = useState(initialRgb);
  const satBoxRef = useRef<HTMLDivElement>(null);
  const isDraggingSat = useRef(false);

  // Sync when prop changes
  useEffect(() => {
    const nextRgb = hexToRgb(color || '#00c2ff');
    setRgb(nextRgb);
    setHsv(rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b));
  }, [color]);

  const updateFromHsv = (newHsv: { h: number; s: number; v: number }) => {
    setHsv(newHsv);
    const newRgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    setRgb(newRgb);
    onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleSatBoxMove = (e: MouseEvent | React.MouseEvent) => {
    if (!satBoxRef.current) return;
    const rect = satBoxRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const s = Math.round((x / rect.width) * 100);
    const v = Math.round((1 - y / rect.height) * 100);
    updateFromHsv({ ...hsv, s, v });
  };

  const handleMouseDownSat = (e: React.MouseEvent) => {
    isDraggingSat.current = true;
    handleSatBoxMove(e);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingSat.current) {
        handleSatBoxMove(moveEvent);
      }
    };
    const onMouseUp = () => {
      isDraggingSat.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newH = Number(e.target.value);
    updateFromHsv({ ...hsv, h: newH });
  };

  const handleRgbInput = (channel: 'r' | 'g' | 'b', val: string) => {
    const num = Math.max(0, Math.min(255, Number(val) || 0));
    const newRgb = { ...rgb, [channel]: num };
    setRgb(newRgb);
    setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b));
    onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleEyeDropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          onChange(result.sRGBHex);
        }
      } catch {
        // user cancelled
      }
    }
  };

  const currentHex = rgbToHex(rgb.r, rgb.g, rgb.b);
  const pureHueHex = rgbToHex(
    hsvToRgb(hsv.h, 100, 100).r,
    hsvToRgb(hsv.h, 100, 100).g,
    hsvToRgb(hsv.h, 100, 100).b
  );

  return (
    <div className="w-[280px] sm:w-[300px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 text-zinc-900 select-none animate-in fade-in zoom-in-95 duration-100">
      {/* 2D SATURATION / VALUE GRADIENT (Screenshot 2) */}
      <div
        ref={satBoxRef}
        onMouseDown={handleMouseDownSat}
        className="w-full h-40 relative cursor-crosshair overflow-hidden"
        style={{
          backgroundColor: pureHueHex
        }}
      >
        {/* White gradient left-to-right */}
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        {/* Black gradient top-to-bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />

        {/* Circular thumb picker indicator */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_2px_rgba(0,0,0,0.8)] pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            backgroundColor: currentHex
          }}
        />
      </div>

      {/* CONTROLS STRIP (Screenshot 2) */}
      <div className="p-3.5 space-y-3 bg-white">
        {/* Row 1: Eyedropper + Color Circle Preview + Hue Slider */}
        <div className="flex items-center gap-3">
          {/* Eyedropper button */}
          <button
            type="button"
            onClick={handleEyeDropper}
            title="Eyedropper tool"
            className="w-8 h-8 rounded-lg border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer shrink-0"
          >
            <Pipette className="w-4 h-4" />
          </button>

          {/* Current Color Circle Preview */}
          <div
            className="w-8 h-8 rounded-full border border-black/15 shadow-inner shrink-0"
            style={{ backgroundColor: currentHex }}
          />

          {/* Hue slider rainbow bar */}
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min="0"
              max="360"
              value={hsv.h}
              onChange={handleHueChange}
              className="w-full h-3 rounded-full appearance-none cursor-pointer outline-none"
              style={{
                background:
                  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
              }}
            />
          </div>
        </div>

        {/* Row 2: RGB Number Inputs with R, G, B labels (Screenshot 2) */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <input
              type="number"
              min="0"
              max="255"
              value={rgb.r}
              onChange={(e) => handleRgbInput('r', e.target.value)}
              className="w-full border border-zinc-300 rounded-lg py-1.5 px-1 text-center font-semibold text-sm text-zinc-800 focus:outline-none focus:border-cyan-500 shadow-xs"
            />
            <span className="text-[11px] font-bold text-zinc-500 mt-1 block">R</span>
          </div>

          <div>
            <input
              type="number"
              min="0"
              max="255"
              value={rgb.g}
              onChange={(e) => handleRgbInput('g', e.target.value)}
              className="w-full border border-zinc-300 rounded-lg py-1.5 px-1 text-center font-semibold text-sm text-zinc-800 focus:outline-none focus:border-cyan-500 shadow-xs"
            />
            <span className="text-[11px] font-bold text-zinc-500 mt-1 block">G</span>
          </div>

          <div>
            <input
              type="number"
              min="0"
              max="255"
              value={rgb.b}
              onChange={(e) => handleRgbInput('b', e.target.value)}
              className="w-full border border-zinc-300 rounded-lg py-1.5 px-1 text-center font-semibold text-sm text-zinc-800 focus:outline-none focus:border-cyan-500 shadow-xs"
            />
            <span className="text-[11px] font-bold text-zinc-500 mt-1 block">B</span>
          </div>
        </div>

        {/* Quick color preset chips */}
        <div className="pt-1 flex items-center justify-between border-t border-zinc-100">
          <div className="flex items-center gap-1.5">
            {[
              '#00f0ff',
              '#3b82f6',
              '#a855f7',
              '#ec4899',
              '#ef4444',
              '#f59e0b',
              '#10b981',
              '#ffffff'
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange(preset)}
                className="w-5 h-5 rounded-full border border-black/20 hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: preset }}
              />
            ))}
          </div>
          <span className="text-[11px] font-mono text-zinc-500 uppercase">{currentHex}</span>
        </div>
      </div>
    </div>
  );
}
