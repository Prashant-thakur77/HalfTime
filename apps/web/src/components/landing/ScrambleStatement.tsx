"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

const GLYPHS = "अआइउएकखगघचछजझटठडढतथदधनपफबभमयरलवशषसह०१२३४५६७८९";

/**
 * A statement that is typed out of the court's own alphabet: as it scrolls into place, each letter settles from a
 * Devanagari glyph into English, left to right. The real sentence is in the DOM for readers and search; the
 * scramble is decoration (aria-hidden). Reduced motion: the sentence, still.
 */
export function ScrambleStatement({ lines }: { lines: string[] }) {
  const root = useRef<HTMLElement>(null);
  const [p, setP] = useState(1);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      setActive(true);
      setP(0);
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        end: "bottom 45%",
        scrub: 0.4,
        onUpdate: (s) => setP(s.progress)
      });
      return () => {
        st.kill();
        setActive(false);
        setP(1);
      };
    });
    return () => mm.revert();
  }, []);

  const total = lines.reduce((a, l) => a + l.length, 0);
  let offset = 0;
  return (
    <section ref={root} aria-label="What HalfTime does" className="on-ink overflow-hidden bg-ink py-28 text-paper md:py-40">
      <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)]">
        <p className="sr-only">{lines.join(" ")}</p>
        <div aria-hidden className="font-sans text-[clamp(2.4rem,7.4vw,7.6rem)] leading-[0.95] font-[780] tracking-[-0.025em] [font-stretch:80%]">
          {lines.map((line, li) => {
            const start = offset;
            offset += line.length;
            return (
              <div key={li} className={li % 2 ? "text-carbon-soft" : ""}>
                {line.split("").map((ch, i) => {
                  const k = (start + i) / total; // where this letter settles
                  const local = active ? Math.min(1, Math.max(0, (p * 1.25 - k) / 0.12)) : 1;
                  if (ch === " ") return <span key={i}> </span>;
                  if (local >= 1) return <span key={i}>{ch}</span>;
                  const g = GLYPHS[(start + i * 7 + Math.floor(p * 40)) % GLYPHS.length];
                  return (
                    <span key={i} className="inline-block font-serif text-stamp-on-ink" style={{ opacity: 0.25 + 0.75 * local, minWidth: "0.5em" }}>
                      {g}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
