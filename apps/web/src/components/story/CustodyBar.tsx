/**
 * Our arithmetic for the 2011 case, drawn on a ruled strip: the longest maximum
 * charged (three years), the half line at eighteen months, and about two years
 * held. Decorative bar; the numbers are also written out as text.
 */
export function CustodyBar() {
  const MAX = 36;
  const HALF = 18;
  const HELD = 24;
  const pct = (m: number) => `${(m / MAX) * 100}%`;
  return (
    <figure className="ruled relative border border-ink bg-paper py-6 pr-5 pl-14 shadow-[10px_10px_0_var(--ink)]">
      <p className="caps text-ink-3">Our arithmetic, not the report&apos;s</p>
      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 font-mono text-[0.88rem] leading-[1.75rem] tabular">
        <dt className="text-ink-3">Charge</dt>
        <dd className="text-right text-ink-3">Maximum</dd>
        <dt>Theft, IPC 379</dt>
        <dd className="text-right">36 months</dd>
        <dt>Stolen goods, IPC 411</dt>
        <dd className="text-right">36 months</dd>
        <dt className="text-stamp-text">Half of 36 months</dt>
        <dd className="text-right text-stamp-text">18 months</dd>
        <dt className="font-[600]">Held, about</dt>
        <dd className="text-right font-[600]">24 months</dd>
      </dl>

      <div aria-hidden className="relative mt-7 mb-2">
        <div className="relative h-5 border border-ink bg-paper-2">
          <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: pct(HELD) }} />
          <div className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,var(--stamp)_0_2px,transparent_2px_7px)]" style={{ left: pct(HALF), width: pct(HELD - HALF) }} />
        </div>
        <div data-rule="y" className="absolute -top-4 -bottom-4 w-[3px] origin-top -translate-x-1/2 bg-stamp" style={{ left: pct(HALF) }} />
        <div className="relative mt-6 flex justify-between font-mono text-[0.7rem] text-ink-3 tabular">
          <span>0</span>
          <span className="absolute top-0 -translate-x-full pr-2 text-stamp-text" style={{ left: pct(HALF) }}>half · 18</span>
          <span className="absolute top-0 pl-2 font-[600] text-ink" style={{ left: pct(HELD) }}>24</span>
          <span>36</span>
        </div>
      </div>
      <figcaption className="mt-4 font-serif text-[1.02rem] leading-[1.75rem]">
        Two years is more than half of three. Everything past the red line is time held beyond half the longest maximum charged.
      </figcaption>
    </figure>
  );
}
