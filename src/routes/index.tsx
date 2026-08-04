import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, MicOff, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTuner } from "@/hooks/useTuner";
import { TuningDial } from "@/components/tuner/TuningDial";
import { WaveformScope } from "@/components/tuner/WaveformScope";
import { SpectrumScope } from "@/components/tuner/SpectrumScope";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fourier Tuner — Instrument Tuning You Can See" },
      {
        name: "description",
        content:
          "A browser tuner built on Fourier analysis: live waveform scope, FFT spectrum with harmonics, and cent-accurate pitch readout for any instrument.",
      },
      { property: "og:title", content: "Fourier Tuner — Instrument Tuning You Can See" },
      {
        property: "og:description",
        content:
          "Tune by ear and by eye: real-time oscilloscope, FFT spectrum, harmonic guides and cent deviation, all in the browser.",
      },
    ],
  }),
  component: TunerPage,
});

function Panel({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel p-4 ${className}`}>
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[0.68rem] tracking-[0.22em] text-foreground/80 uppercase">
          {label}
        </h2>
        {hint ? (
          <p className="font-mono text-[0.62rem] text-muted-foreground">{hint}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 py-2 last:border-0">
      <span className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-mono text-sm text-foreground">
        {value}
        {unit ? <span className="ml-1 text-muted-foreground">{unit}</span> : null}
      </span>
    </div>
  );
}

function TunerPage() {
  const [a4, setA4] = useState(440);
  const tuner = useTuner(a4);
  const { reading, status } = tuner;
  const running = status === "running";
  const binHz = tuner.sampleRate / tuner.fftSize;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.3em] text-accent uppercase">
            Fourier analysis · live
          </p>
          <h1 className="font-display mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            Fourier Tuner
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Autocorrelation finds the period, the FFT shows the harmonics. Everything the
            detector sees is on screen.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="panel flex items-center gap-2 px-3 py-2">
            <span className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
              A4
            </span>
            <input
              type="number"
              value={a4}
              min={392}
              max={466}
              onChange={(e) => setA4(Number(e.target.value) || 440)}
              className="w-16 bg-transparent font-mono text-sm text-foreground outline-none"
            />
            <span className="font-mono text-xs text-muted-foreground">Hz</span>
          </label>
          <Button
            size="lg"
            variant={running ? "secondary" : "default"}
            onClick={() => (running ? tuner.stop() : void tuner.start())}
          >
            {running ? <MicOff /> : <Mic />}
            {running ? "Stop" : status === "starting" ? "Starting…" : "Start listening"}
          </Button>
        </div>
      </header>

      {tuner.error ? (
        <p className="panel border-destructive/50 p-4 text-sm text-destructive">{tuner.error}</p>
      ) : null}

      <Panel
        label="Pitch readout"
        hint={reading ? `${reading.freq.toFixed(2)} Hz detected` : "no stable pitch"}
      >
        <TuningDial
          cents={reading ? reading.note.cents : null}
          note={reading ? reading.note.name : null}
          octave={reading ? reading.note.octave : null}
        />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <Panel label="Time domain · oscilloscope" hint="zero-cross triggered, period locked">
            <div className="h-44 sm:h-52">
              <WaveformScope
                dataRef={tuner.timeRef}
                period={reading?.period}
                active={running}
              />
            </div>
          </Panel>

          <Panel label="Frequency domain · FFT magnitude" hint={`${tuner.fftSize}-point, 0–4 kHz`}>
            <div className="h-44 sm:h-52">
              <SpectrumScope
                dataRef={tuner.freqRef}
                sampleRate={tuner.sampleRate}
                fftSize={tuner.fftSize}
                fundamental={reading?.freq}
                active={running}
              />
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel label="Under the hood">
            <div className="flex flex-col">
              <Stat
                label="Fundamental f₀"
                value={reading ? reading.freq.toFixed(3) : "—"}
                unit="Hz"
              />
              <Stat
                label="Target note"
                value={
                  reading ? `${reading.note.name}${reading.note.octave}` : "—"
                }
              />
              <Stat
                label="Target freq"
                value={reading ? reading.note.target.toFixed(3) : "—"}
                unit="Hz"
              />
              <Stat
                label="Deviation"
                value={reading ? `${reading.note.cents > 0 ? "+" : ""}${reading.note.cents.toFixed(2)}` : "—"}
                unit="cents"
              />
              <Stat
                label="Period"
                value={reading ? reading.period.toFixed(2) : "—"}
                unit="samples"
              />
              <Stat
                label="ACF clarity"
                value={reading ? `${(reading.clarity * 100).toFixed(1)}` : "—"}
                unit="%"
              />
              <Stat label="Level (RMS)" value={reading ? reading.rms.toFixed(4) : "—"} />
              <Stat
                label="Spectral peak"
                value={reading && reading.peakFreq ? reading.peakFreq.toFixed(1) : "—"}
                unit="Hz"
              />
              <Stat label="Peak bin" value={reading?.peakBin ? `#${reading.peakBin}` : "—"} />
              <Stat label="Sample rate" value={tuner.sampleRate.toLocaleString()} unit="Hz" />
              <Stat label="Bin width" value={binHz.toFixed(2)} unit="Hz" />
              <Stat label="MIDI note" value={reading ? String(reading.note.midi) : "—"} />
            </div>
          </Panel>

          <Panel label="How it works">
            <ol className="flex flex-col gap-3 text-sm text-muted-foreground">
              {[
                "Mic audio is captured raw — no AGC, no noise suppression — into a 4096-sample window.",
                "The FFT decomposes that window into frequency bins: the spectrum panel is Fourier's view of your sound.",
                "Autocorrelation (the FFT's time-domain twin) finds the lag where the wave repeats — that lag is the period.",
                "Parabolic interpolation refines the peak, giving sub-bin frequency precision.",
                "Frequency becomes a note via 1200·log₂(f/f_target) cents against your A4 reference.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-xs text-accent">{`0${i + 1}`}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <footer className="mt-2 flex items-center gap-2 font-mono text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">
        <Waves className="size-3.5" />
        audio never leaves your device
      </footer>
    </main>
  );
}
