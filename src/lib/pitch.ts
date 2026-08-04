export const NOTE_NAMES = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
] as const;

export type NoteInfo = {
  /** Nearest note name, e.g. "A" */
  name: string;
  /** Scientific pitch octave */
  octave: number;
  /** Exact frequency of the nearest note */
  target: number;
  /** Signed deviation in cents, negative = flat */
  cents: number;
  /** MIDI note number of nearest note */
  midi: number;
};

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function freqToNote(freq: number, a4 = 440): NoteInfo {
  const exact = 69 + 12 * Math.log2(freq / a4);
  const midi = Math.round(exact);
  const target = midiToFreq(midi, a4);
  return {
    name: NOTE_NAMES[((midi % 12) + 12) % 12]!,
    octave: Math.floor(midi / 12) - 1,
    target,
    cents: 1200 * Math.log2(freq / target),
    midi,
  };
}

/**
 * Autocorrelation pitch estimator (ACF) with parabolic interpolation.
 * Time-domain twin of the FFT: we look for the lag at which the signal
 * best resembles a delayed copy of itself — that lag is the period.
 */
export function detectPitchACF(
  buf: Float32Array,
  sampleRate: number,
  minHz = 45,
  maxHz = 1600,
): { freq: number; clarity: number; period: number } | null {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i]! * buf[i]!;
  rms = Math.sqrt(rms / n);
  if (rms < 0.006) return null;

  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.min(Math.floor(sampleRate / minHz), Math.floor(n / 2));
  if (maxLag <= minLag) return null;

  let bestLag = -1;
  let bestCorr = 0;
  let energyZero = 0;
  for (let i = 0; i < n / 2; i++) energyZero += buf[i]! * buf[i]!;

  const corrs = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let energyLag = 0;
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++) {
      sum += buf[i]! * buf[i + lag]!;
      energyLag += buf[i + lag]! * buf[i + lag]!;
    }
    const norm = Math.sqrt(energyZero * energyLag) || 1;
    const c = sum / norm;
    corrs[lag] = c;
    if (c > bestCorr) {
      bestCorr = c;
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestCorr < 0.5) return null;

  // Parabolic interpolation around the peak for sub-sample precision.
  const y1 = corrs[bestLag - 1] ?? bestCorr;
  const y2 = bestCorr;
  const y3 = corrs[bestLag + 1] ?? bestCorr;
  const denom = y1 - 2 * y2 + y3;
  const shift = denom !== 0 ? (0.5 * (y1 - y3)) / denom : 0;
  const period = bestLag + shift;

  return { freq: sampleRate / period, clarity: bestCorr, period };
}

/** Peak bin of a magnitude spectrum, refined by quadratic interpolation. */
export function spectralPeak(
  mags: Uint8Array,
  sampleRate: number,
  fftSize: number,
): { freq: number; bin: number } | null {
  let bin = -1;
  let max = 0;
  // Skip DC / rumble bins below ~40 Hz so leakage can't win the peak search.
  const startBin = Math.max(2, Math.ceil((40 * fftSize) / sampleRate));
  for (let i = startBin; i < mags.length; i++) {
    if (mags[i]! > max) {
      max = mags[i]!;
      bin = i;
    }
  }
  if (bin < 0 || max < 24) return null;
  const y1 = mags[bin - 1] ?? max;
  const y3 = mags[bin + 1] ?? max;
  const denom = y1 - 2 * max + y3;
  const shift = denom !== 0 ? (0.5 * (y1 - y3)) / denom : 0;
  return { freq: ((bin + shift) * sampleRate) / fftSize, bin };
}
