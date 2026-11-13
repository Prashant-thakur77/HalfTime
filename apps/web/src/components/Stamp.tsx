/** The red court stamp. Decorative ring; the text inside is real text for screen readers. */
export function Stamp({
  top = "SEC 479(3)",
  main = "PAST THE LINE",
  bottom = "JAIL MUST APPLY",
  className = "",
  tone = "stamp"
}: {
  top?: string;
  main?: string;
  bottom?: string;
  className?: string;
  tone?: "stamp" | "flag" | "ink";
}) {
  const color = tone === "stamp" ? "text-stamp border-stamp" : tone === "flag" ? "text-flag border-flag" : "text-ink border-ink";
  return (
    <div
      className={`relative inline-flex select-none flex-col items-center justify-center rounded-[14px] border-[3px] px-5 py-2.5 font-sans uppercase mix-blend-multiply ${color} ${className}`}
      style={{ maskImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='.7' numOctaves='2'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 -1.6 1.35'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }}
    >
      <span className="text-[0.68em] font-[700] tracking-[0.18em]">{top}</span>
      <span className="my-0.5 border-y-2 border-current px-1 text-[1.25em] font-[900] leading-tight tracking-[0.04em] [font-stretch:118%]">{main}</span>
      <span className="text-[0.62em] font-[700] tracking-[0.16em]">{bottom}</span>
    </div>
  );
}
