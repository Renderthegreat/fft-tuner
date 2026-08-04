import { useCallback, useEffect, useRef, useState } from "react";

export type MetronomeState = {
  running: boolean;
  bpm: number;
  beatsPerBar: number;
  /** 0-indexed beat within the current bar, -1 when stopped. */
  beat: number;
};

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

/**
 * Sample-accurate click scheduler. Runs on its own AudioContext so it can
 * play at the same time as the tuner's input analysis.
 */
export function useMetronome() {
  const [running, setRunning] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [beat, setBeat] = useState(-1);
  const [muted, setMuted] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextNoteRef = useRef(0);
  const beatRef = useRef(0);
  const bpmRef = useRef(bpm);
  const barRef = useRef(beatsPerBar);
  const mutedRef = useRef(muted);
  bpmRef.current = bpm;
  barRef.current = beatsPerBar;
  mutedRef.current = muted;

  const tapsRef = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState(0);

  const click = useCallback((time: number, accent: boolean) => {
    const ctx = ctxRef.current;
    if (!ctx || mutedRef.current) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.28, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.07);
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
    setBeat(-1);
    beatRef.current = 0;
  }, []);

  const start = useCallback(() => {
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    void ctx.resume();
    beatRef.current = 0;
    nextNoteRef.current = ctx.currentTime + 0.08;
    setRunning(true);

    timerRef.current = setInterval(() => {
      const c = ctxRef.current;
      if (!c) return;
      while (nextNoteRef.current < c.currentTime + SCHEDULE_AHEAD) {
        const index = beatRef.current % barRef.current;
        click(nextNoteRef.current, index === 0);
        const when = nextNoteRef.current;
        const b = index;
        window.setTimeout(
          () => setBeat(b),
          Math.max(0, (when - c.currentTime) * 1000),
        );
        nextNoteRef.current += 60 / bpmRef.current;
        beatRef.current += 1;
      }
    }, LOOKAHEAD_MS);
  }, [click]);

  const toggle = useCallback(() => (running ? stop() : start()), [running, start, stop]);

  /** Tap tempo: averages the intervals between recent taps. */
  const tap = useCallback(() => {
    const now = performance.now();
    const taps = tapsRef.current.filter((t) => now - t < 2500);
    taps.push(now);
    tapsRef.current = taps.slice(-6);
    setTapCount(tapsRef.current.length);
    if (tapsRef.current.length < 2) return;
    let sum = 0;
    for (let i = 1; i < tapsRef.current.length; i++) {
      sum += tapsRef.current[i]! - tapsRef.current[i - 1]!;
    }
    const avg = sum / (tapsRef.current.length - 1);
    const next = Math.round(60000 / avg);
    if (next >= 30 && next <= 300) setBpm(next);
  }, []);

  const resetTaps = useCallback(() => {
    tapsRef.current = [];
    setTapCount(0);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      void ctxRef.current?.close();
    },
    [],
  );

  return {
    running,
    bpm,
    beatsPerBar,
    beat,
    muted,
    tapCount,
    interval: 60 / bpm,
    setBpm: (v: number) => setBpm(Math.max(30, Math.min(300, Math.round(v) || 30))),
    setBeatsPerBar,
    setMuted,
    start,
    stop,
    toggle,
    tap,
    resetTaps,
  };
}
