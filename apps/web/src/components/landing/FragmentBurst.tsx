"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

/**
 * A burst of real sentences from the sample orders (constructed, names masked) scattered around "479". As the
 * section scrolls through, the fragments are pulled in toward the number and settle into a filed stack; the
 * number turns stamp red. No faces, no people: only the paper. Reduced motion: the settled state.
 */
export function FragmentBurst({ fragments }: { fragments: { text: string; lang: "hi" | "en" }[] }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const frags = gsap.utils.toArray<HTMLElement>("[data-frag]", el);
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 70%", end: "bottom 60%", scrub: 0.6 } });
      frags.forEach((f, i) => {
        const a = (i / frags.length) * Math.PI * 2;
        tl.fromTo(f, { x: Math.cos(a) * 640, y: Math.sin(a) * 340, rotate: (i % 2 ? 1 : -1) * (12 + (i % 5) * 4) },
          { x: 0, y: 0, rotate: (i % 2 ? 1 : -1) * (i % 4), ease: "power2.out", duration: 1 }, i * 0.02);
      });
      tl.fromTo("[data-num]", { color: "var(--ink)" }, { color: "var(--stamp)", duration: 0.3 }, 0.8);
      return () => tl.kill();
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} aria-labelledby="burst-h" className="relative overflow-hidden bg-paper py-28 md:py-36">
      <div className="relative mx-auto flex min-h-[70vh] max-w-[var(--max)] items-center justify-center px-[var(--gutter)]">
        <div aria-hidden className="absolute inset-0 flex items-center justify-center">
          {fragments.map((f, i) => (
            <span
              key={i}
              data-frag
              lang={f.lang}
              className="absolute max-w-[min(70vw,420px)] border border-ink bg-paper-2 px-3 py-2 font-serif text-[clamp(0.8rem,1.4vw,1rem)] leading-snug shadow-[3px_3px_0_var(--ink)]"
              style={{ left: `${8 + ((i * 37) % 70)}%`, top: `${6 + ((i * 53) % 82)}%`, transform: `rotate(${(i % 2 ? 1 : -1) * (i % 4)}deg)` }}
            >
              {f.text}
            </span>
          ))}
        </div>
        <div className="relative z-10 bg-paper/80 px-6 py-4 text-center backdrop-blur-[2px]">
          <p data-num className="font-sans text-[clamp(7rem,26vw,22rem)] leading-[0.8] font-[800] tracking-[-0.05em] [font-stretch:72%]">479</p>
          <h2 id="burst-h" className="mx-auto mt-4 max-w-xl font-serif text-[length:var(--step-1)] leading-snug">
            Every scrap on this page is a sentence from a bail order. The answer to Section 479 is in there, if someone reads them all.
          </h2>
        </div>
      </div>
    </section>
  );
}
