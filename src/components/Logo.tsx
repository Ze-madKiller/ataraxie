/** Brand mark: a check in a rounded square, same drawing as src/app/icon.svg. */
/** `compact` hides the wordmark on very narrow screens (the link keeps its aria-label). */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden className="shrink-0">
        <rect width="64" height="64" rx="14" className="fill-accent" />
        <path d="M18 34.5l9 9 19-21" fill="none" className="stroke-on-accent" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`font-serif text-lg font-semibold tracking-tight whitespace-nowrap text-foreground sm:text-xl${compact ? " max-[24rem]:sr-only" : ""}`}>
        E-ATARAXIE
      </span>
    </span>
  );
}
