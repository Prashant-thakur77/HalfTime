/** HALF|TIME, split at the middle like the line it is named after. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-sans font-[800] tracking-[-0.02em] [font-stretch:112%] ${className}`} aria-label="HalfTime">
      <span aria-hidden>HALF</span>
      <span aria-hidden className="mx-[0.06em] inline-block h-[0.82em] w-[0.08em] translate-y-[0.06em] -skew-x-12 bg-stamp" />
      <span aria-hidden>TIME</span>
    </span>
  );
}
