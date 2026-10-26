/** Accessible progress bar. Pass `segments` for a stacked bar (e.g. correct / wrong); otherwise one fill. */
export function ProgressBar({
  value,
  max,
  label,
  segments,
  className = "",
}: {
  value: number;
  max: number;
  label: string;
  segments?: { value: number; className: string }[];
  className?: string;
}) {
  const pct = (n: number) => (max > 0 ? Math.min(100, (n / max) * 100) : 0);
  const parts = segments ?? [{ value, className: "bg-accent" }];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`flex h-2 w-full overflow-hidden rounded-full bg-track ${className}`}
    >
      {parts.map((s, i) => (
        <div key={i} className={`h-full transition-[width] duration-300 motion-reduce:transition-none ${s.className}`} style={{ width: `${pct(s.value)}%` }} />
      ))}
    </div>
  );
}
