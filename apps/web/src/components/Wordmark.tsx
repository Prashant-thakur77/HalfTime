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

/** The giant wordmark, drawn as SVG so it always fits its width exactly. */
export function BigWordmark({ variant = "solid", className = "" }: { variant?: "solid" | "outline"; className?: string }) {
  const outline = variant === "outline";
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 1000 146" className={`block w-full ${className}`} preserveAspectRatio="xMidYMax meet">
      <text
        x="0"
        y="138"
        textLength="1000"
        lengthAdjust="spacingAndGlyphs"
        style={{ fontFamily: "var(--font-archivo)", fontWeight: 850, fontSize: 176, fontStretch: "125%", letterSpacing: "-0.04em" }}
      >
        <tspan fill={outline ? "none" : "var(--carbon)"} stroke={outline ? "rgba(241,236,224,0.28)" : "none"} strokeWidth={outline ? 1.5 : 0}>
          HALF
        </tspan>
        <tspan fill={outline ? "none" : "var(--stamp)"} stroke={outline ? "rgba(240,122,110,0.55)" : "none"} strokeWidth={outline ? 1.5 : 0}>
          TIME
        </tspan>
      </text>
    </svg>
  );
}
