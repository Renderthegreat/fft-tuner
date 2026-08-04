import { useEffect, useRef } from "react";

/** Reads a CSS custom property as a usable color string. */
function cssVar(el: HTMLElement, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

type Props = {
  dataRef: React.RefObject<Float32Array<ArrayBuffer>>;
  /** Detected period in samples — used to lock the trace and mark one cycle. */
  period?: number | undefined;
  active: boolean;
};

export function WaveformScope({ dataRef, period, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const periodRef = useRef<number | undefined>(period);
  periodRef.current = period;

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
      const trace = cssVar(canvas, "--scope-trace", "#7ce8d5");
      const marker = cssVar(canvas, "--scope-marker", "#f0b429");

      // graticule
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const x = (w / 8) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const buf = dataRef.current;
      if (!buf || !active) return;

      // trigger: find a rising zero crossing so the trace stands still
      let start = 0;
      for (let i = 1; i < buf.length / 2; i++) {
        if (buf[i - 1]! <= 0 && buf[i]! > 0) {
          start = i;
          break;
        }
      }

      const p = periodRef.current;
      const visible = p && p > 4 ? Math.min(Math.round(p * 4), buf.length - start) : 1024;

      ctx.strokeStyle = trace;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < visible; i++) {
        const v = buf[start + i] ?? 0;
        const x = (i / visible) * w;
        const y = h / 2 - v * (h / 2) * 0.92;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // one-period bracket
      if (p && p > 4) {
        const px = (p / visible) * w;
        ctx.strokeStyle = marker;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = marker;
        ctx.font = "10px ui-monospace, monospace";
        ctx.fillText("1 period", Math.min(px + 6, w - 56), 14);
      }
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [dataRef, active]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-label="Waveform oscilloscope" />;
}
