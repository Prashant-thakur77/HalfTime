import { SOURCES, sourceNo, type SourceKey } from "./sources";

/** An inline source marker that opens the source itself. */
export function Cite({ k, className = "" }: { k: SourceKey; className?: string }) {
  const s = SOURCES[k]!;
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Source ${sourceNo(k)}: ${s.label} (opens in a new tab)`}
      className={`ml-0.5 inline-block align-super font-mono text-[0.62em] leading-none text-carbon no-underline hover:bg-mark ${className}`}
    >
      [{sourceNo(k)}]
    </a>
  );
}

/** A full source line, for numbers and timeline nodes. */
export function SourceLink({ k, className = "" }: { k: SourceKey; className?: string }) {
  const s = SOURCES[k]!;
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" className={`block text-[0.78rem] leading-snug text-ink-3 underline decoration-carbon-soft underline-offset-2 hover:bg-mark hover:text-ink ${className}`}>
      <span className="font-mono">[{sourceNo(k)}]</span> {s.label}
    </a>
  );
}
