import { Minus, Pause, Play, Plus, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/tuner/Panel";
import type { useMetronome } from "@/hooks/useMetronome";

function tempoMark(bpm: number) {
  if (bpm < 60) return "Largo";
  if (bpm < 76) return "Adagio";
  if (bpm < 108) return "Andante";
  if (bpm < 120) return "Moderato";
  if (bpm < 156) return "Allegro";
  if (bpm < 176) return "Vivace";
  return "Presto";
}

export function MetronomePanel({ m }: { m: ReturnType<typeof useMetronome> }) {
  return (
    <Panel
      label="Metronome"
      hint={`${(m.interval * 1000).toFixed(1)} ms / beat · ${(m.bpm / 60).toFixed(3)} Hz`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span
              className="font-display text-6xl leading-none tracking-tight text-dial tabular-nums"
              style={{ textShadow: "var(--glow-dial)" }}
            >
              {m.bpm}
            </span>
            <div className="flex flex-col">
              <span className="font-mono text-[0.62rem] tracking-[0.22em] text-muted-foreground uppercase">
                bpm
              </span>
              <span className="font-mono text-xs text-accent">{tempoMark(m.bpm)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              aria-label="Decrease tempo"
              onClick={() => m.setBpm(m.bpm - 1)}
            >
              <Minus />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              aria-label="Increase tempo"
              onClick={() => m.setBpm(m.bpm + 1)}
            >
              <Plus />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              aria-label={m.muted ? "Unmute clicks" : "Mute clicks"}
              onClick={() => m.setMuted(!m.muted)}
            >
              {m.muted ? <VolumeX /> : <Volume2 />}
            </Button>
            <Button onClick={m.toggle} aria-label={m.running ? "Stop metronome" : "Start metronome"}>
              {m.running ? <Pause /> : <Play />}
              {m.running ? "Stop" : "Start"}
            </Button>
          </div>
        </div>

        <input
          type="range"
          min={30}
          max={300}
          value={m.bpm}
          aria-label="Tempo"
          onChange={(e) => m.setBpm(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--color-dial)]"
        />

        {/* beat lamps */}
        <div className="flex items-center gap-2">
          {Array.from({ length: m.beatsPerBar }).map((_, i) => {
            const on = m.running && m.beat === i;
            return (
              <span
                key={i}
                className="h-9 flex-1 rounded-md border border-border transition-all duration-75"
                style={{
                  background: on
                    ? i === 0
                      ? "var(--color-accent)"
                      : "var(--color-dial)"
                    : "var(--color-secondary)",
                  boxShadow: on ? "var(--glow-dial)" : "none",
                  transform: on ? "scaleY(1.08)" : "none",
                }}
              />
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" className="flex-1" onClick={m.tap} onDoubleClick={m.tap}>
            Tap tempo
          </Button>
          <div className="flex items-center gap-1">
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                onClick={() => m.setBeatsPerBar(n)}
                aria-label={`${n} beats per bar`}
                className="size-8 rounded-md border border-border font-mono text-xs transition-colors data-[on=true]:border-transparent data-[on=true]:bg-primary data-[on=true]:text-primary-foreground"
                data-on={m.beatsPerBar === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground uppercase">
          {m.tapCount > 1
            ? `averaging ${m.tapCount} taps`
            : m.tapCount === 1
              ? "tap again to set tempo"
              : `${m.beatsPerBar}/4 · accent on beat 1`}
        </p>
      </div>
    </Panel>
  );
}
