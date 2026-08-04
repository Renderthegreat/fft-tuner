type Props = {
  cents: number | null;
  note: string | null;
  octave: number | null;
};

const RANGE = 50; // cents shown either side

export function TuningDial({ cents, note, octave }: Props) {
  const clamped = cents === null ? 0 : Math.max(-RANGE, Math.min(RANGE, cents));
  const pct = 50 + (clamped / RANGE) * 50;
  const inTune = cents !== null && Math.abs(cents) <= 5;
  const state = cents === null ? "idle" : inTune ? "tuned" : cents < 0 ? "flat" : "sharp";

  return (
    <div className="w-full" data-state={state}>
      <div className="flex items-end justify-between gap-4">
        <span className="font-mono text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
          flat
        </span>
        <div className="flex items-baseline gap-2">
          <span
            className="font-display text-[5.5rem] leading-none tracking-tight text-dial"
            style={{ textShadow: "var(--glow-dial)" }}
          >
            {note ?? "—"}
          </span>
          <span className="font-mono text-lg text-muted-foreground">
            {octave !== null ? octave : ""}
          </span>
        </div>
        <span className="font-mono text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
          sharp
        </span>
      </div>

      <div className="mt-6 relative h-16">
        {/* tick ladder */}
        <div className="absolute inset-x-0 top-0 flex justify-between">
          {Array.from({ length: 41 }).map((_, i) => {
            const major = i % 10 === 0;
            const center = i === 20;
            return (
              <span
                key={i}
                className="w-px rounded-full bg-border"
                style={{
                  height: center ? 34 : major ? 24 : 12,
                  opacity: center ? 1 : major ? 0.7 : 0.35,
                  background: center ? "var(--color-dial)" : undefined,
                }}
              />
            );
          })}
        </div>

        {/* needle */}
        <div
          className="absolute top-0 h-[34px] w-[3px] rounded-full transition-[left] duration-100 ease-out"
          style={{
            left: `${pct}%`,
            transform: "translateX(-50%)",
            background: "var(--color-dial)",
            boxShadow: "var(--glow-dial)",
            opacity: cents === null ? 0.25 : 1,
          }}
        />

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between font-mono text-[0.65rem] text-muted-foreground">
          <span>-50¢</span>
          <span className="text-dial">
            {cents === null ? "listening…" : `${cents > 0 ? "+" : ""}${cents.toFixed(1)}¢`}
          </span>
          <span>+50¢</span>
        </div>
      </div>
    </div>
  );
}
