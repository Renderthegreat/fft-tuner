import { useCallback, useEffect, useRef, useState } from "react";
import { detectPitchACF, freqToNote, spectralPeak, type NoteInfo } from "@/lib/pitch";

export type TunerStatus = "idle" | "starting" | "running" | "error";

export type Reading = {
  freq: number;
  clarity: number;
  period: number;
  rms: number;
  note: NoteInfo;
  peakBin: number;
  peakFreq: number;
};

const FFT_SIZE = 4096;

export function useTuner(a4: number) {
  const [status, setStatus] = useState<TunerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [sampleRate, setSampleRate] = useState(48000);

  const timeRef = useRef<Float32Array>(new Float32Array(FFT_SIZE));
  const freqRef = useRef<Uint8Array>(new Uint8Array(FFT_SIZE / 2));
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const a4Ref = useRef(a4);
  a4Ref.current = a4;

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    setStatus("idle");
    setReading(null);
  }, []);

  const start = useCallback(async () => {
    setStatus("starting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      await ctx.resume();
      setSampleRate(ctx.sampleRate);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.35;
      analyser.minDecibels = -95;
      analyser.maxDecibels = -10;
      ctx.createMediaStreamSource(stream).connect(analyser);
      setStatus("running");

      let frame = 0;
      const loop = () => {
        rafRef.current = requestAnimationFrame(loop);
        analyser.getFloatTimeDomainData(timeRef.current);
        analyser.getByteFrequencyData(freqRef.current);
        frame++;
        if (frame % 3 !== 0) return;

        const buf = timeRef.current;
        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i]! * buf[i]!;
        rms = Math.sqrt(rms / buf.length);

        const acf = detectPitchACF(buf, ctx.sampleRate);
        const peak = spectralPeak(freqRef.current, ctx.sampleRate, FFT_SIZE);
        if (!acf) {
          setReading(null);
          return;
        }
        setReading({
          freq: acf.freq,
          clarity: acf.clarity,
          period: acf.period,
          rms,
          note: freqToNote(acf.freq, a4Ref.current),
          peakBin: peak?.bin ?? 0,
          peakFreq: peak?.freq ?? 0,
        });
      };
      loop();
    } catch (e) {
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser to tune."
          : "Could not open the microphone on this device.",
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => stop, [stop]);

  return {
    status,
    error,
    reading,
    sampleRate,
    fftSize: FFT_SIZE,
    timeRef,
    freqRef,
    start,
    stop,
  };
}
