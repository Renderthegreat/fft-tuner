export function Panel({
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
        {hint ? <p className="font-mono text-[0.62rem] text-muted-foreground">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}
