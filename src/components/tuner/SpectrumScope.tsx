import { useEffect, useRef } from "react";

function cssVar(el: HTMLElement, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

type Props = {
  dataRef: React.RefObject<Uint8Array<ArrayBuffer>>;
  sampleRate: number;
  fftSize: number;
  /** Fundamental frequency, used to draw harmonic guides. */
  fundamental?: number | undefined;
  active: boolean;
};

const MAX_HZ = 4000;

export function SpectrumScope({ dataRef, sampleRate, fftSize, fundamental, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fundRef = useRef<number | undefined>(fundamental);
  fundRef.current = fundamental;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const grid = cssVar(canvas, "--scope-grid", "rgba(255,255,255,0.08)");
      const bar = cssVar(canvas, "--scope-bar", "#8ab4ff");
      const barTop = cssVar(canvas, "--scope-bar-top", "#7ce8d5");
      const marker = cssVar(canvas, "--scope-marker", "#f0b429");
      const label = cssVar(canvas, "--scope-label", "rgba(255,255,255,0.45)");

      const binHz = sampleRate / fftSize;
      const maxBin = Math.min(Math.floor(MAX_HZ / binHz), (dataRef.current?.length ?? 0) - 1);

      // frequency ruler
      ctx.strokeStyle = grid;
      ctx.fillStyle = label;
      ctx.font = "9px ui-monospace, monospace";
      for (const hz of [500, 1000, 2000, 3000]) {
        const x = (hz / MAX_HZ) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 12);
        ctx.stroke();
        ctx.fillText(`${hz / 1000}k`, x + 3, h - 3);
      }

      const buf = dataRef.current;
      if (!buf || !active) return;

      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, bar);
      grad.addColorStop(1, barTop);
      ctx.fillStyle = grad;

      const cols = Math.min(maxBin, 320);
      const colW = w / cols;
      for (let c = 0; c < cols; c++) {
        const b0 = Math.floor((c / cols) * maxBin);
        const b1 = Math.max(b0 + 1, Math.floor(((c + 1) / cols) * maxBin));
        let m = 0;
        for (let b = b0; b < b1; b++) m = Math.max(m, buf[b] ?? 0);
        const bh = (m / 255) * (h - 14);
        ctx.fillRect(c * colW, h - 12 - bh, Math.max(colW - 1, 1), bh);
      }

      // harmonic guides — the FFT's evidence that this is one note, not many
      const f0 = fundRef.current;
      if (f0 && f0 > 20) {
        ctx.font = "9px ui-monospace, monospace";
        for (let k = 1; k <= 6; k++) {
          const x = ((f0 * k) / MAX_HZ) * w;
          if (x > w - 4) break;
          ctx.strokeStyle = k === 1 ? marker : grid;
          ctx.setLineDash(k === 1 ? [] : [3, 5]);
          ctx.lineWidth = k === 1 ? 1.5 : 1;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h - 12);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = k === 1 ? marker : label;
          ctx.fillText(k === 1 ? "f₀" : `${k}f`, x + 3, 12);
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [dataRef, sampleRate, fftSize, active]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-label="Frequency spectrum" />;
}
