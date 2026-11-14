"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

const PER = 100;

/**
 * The register as a field of tiles: one tile for every 100 undertrials. Scrolling lays the field down tile by tile
 * on a tilted plane; then it flattens, the field dims, and only the people identified under Section 479 in 2024
 * stay lit, in stamp red. The numbers come from facts.json. Reduced motion: the final, flat state.
 */
export function TileRegister({ undertrials, identified, sourceLabel, sourceUrl }: {
  undertrials: number; identified: number; sourceLabel: string; sourceUrl: string;
}) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const progress = useRef(1);
  const [phase, setPhase] = useState<"fill" | "gap">("gap");
  const tiles = Math.round(undertrials / PER);
  const red = Math.max(1, Math.round(identified / PER));

  useEffect(() => {
    const el = root.current, cv = canvas.current;
    if (!el || !cv) return;
    const ctx = cv.getContext("2d")!;
    let raf = 0, visible = false, t0 = performance.now();
    const cols = window.innerWidth < 640 ? 54 : 124;
    const rows = Math.ceil(tiles / cols);
    // the identified tiles: spread through the field, fixed positions (deterministic)
    const redSet = new Set<number>();
    for (let k = 0; k < red; k++) redSet.add(Math.floor(((k * 0.6180339887 + 0.13) % 1) * tiles));

    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const p = progress.current;
      const fill = Math.min(1, p / 0.55);
      const gap = Math.min(1, Math.max(0, (p - 0.6) / 0.25));
      const cell = Math.min(w / cols, h / rows);
      const s = cell * 0.78;
      const ox = (w - cols * cell) / 2, oy = (h - rows * cell) / 2;
      const time = (performance.now() - t0) / 1000;
      const shown = Math.floor(fill * tiles);
      for (let i = 0; i < tiles; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        const x = ox + c * cell, y = oy + r * cell;
        const isRed = redSet.has(i);
        if (i >= shown && !(isRed && gap > 0)) {
          ctx.fillStyle = "rgba(241,236,224,0.05)";
          ctx.fillRect(x, y, s, s);
          continue;
        }
        const wave = 0.5 + 0.5 * Math.sin(c * 0.22 + r * 0.31 - time * 1.6);
        if (isRed && gap > 0) {
          ctx.fillStyle = `rgba(240,122,110,${0.55 + 0.45 * gap})`;
          const g = s * (1 + 0.9 * gap);
          ctx.fillRect(x - (g - s) / 2, y - (g - s) / 2, g, g);
        } else {
          const a = (0.28 + 0.5 * wave) * (1 - 0.75 * gap);
          ctx.fillStyle = `rgba(241,236,224,${a})`;
          ctx.fillRect(x, y, s, s);
        }
      }
      if (visible) raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    });
    io.observe(cv);

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: reduce)", () => {
      progress.current = 1;
      setPhase("gap");
      el.style.setProperty("--tilt", "0");
      t0 = -1e9;
      draw();
    });
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      progress.current = 0;
      setPhase("fill");
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        onUpdate: (self) => {
          progress.current = self.progress;
          el.style.setProperty("--tilt", String(Math.max(0, 1 - self.progress / 0.7)));
          setPhase(self.progress > 0.6 ? "gap" : "fill");
        }
      });
      return () => st.kill();
    });
    draw();
    return () => { io.disconnect(); cancelAnimationFrame(raf); mm.revert(); };
  }, [tiles, red]);

  return (
    <section ref={root} aria-labelledby="register-h" className="on-ink relative bg-ink text-paper motion-safe:h-[260vh]" style={{ ["--tilt" as string]: 0 }}>
      <div className="flex min-h-screen flex-col justify-center overflow-hidden py-16 motion-safe:sticky motion-safe:top-12 motion-safe:h-[calc(100vh-3rem)]">
        <div className="mx-auto w-full max-w-[var(--max)] px-[var(--gutter)]">
          <p className="caps text-paper/60">The register · one tile = {PER} people</p>
          <h2 id="register-h" className="mt-3 max-w-4xl font-sans text-[length:var(--step-4)] leading-[0.92] font-[780] tracking-[-0.02em] [font-stretch:82%]">
            {phase === "fill" ? (
              <>{undertrials.toLocaleString("en-IN")} people waiting for trial.</>
            ) : (
              <>
                Found under Section 479 in 2024: <span className="text-stamp-on-ink">{identified.toLocaleString("en-IN")}</span>.
              </>
            )}
          </h2>
        </div>
        <div className="mx-auto mt-8 w-full max-w-[1500px] px-[var(--gutter)] [perspective:1400px]">
          <canvas
            ref={canvas}
            aria-hidden
            className="block h-[46vh] w-full origin-bottom [transform:rotateX(calc(var(--tilt)*48deg))_scale(calc(1+var(--tilt)*0.15))]"
          />
        </div>
        <div className="mx-auto mt-6 w-full max-w-[var(--max)] px-[var(--gutter)]">
          <p className="max-w-3xl font-serif text-[length:var(--step-1)] leading-snug text-paper/85">
            {Math.round(undertrials / PER).toLocaleString("en-IN")} tiles. The red ones, about {Math.max(1, Math.round(identified / PER))}, are everyone the
            whole country identified under Section 479 that year. The law is not the hard part. Finding the people is.
          </p>
          <a className="mt-3 inline-block text-[0.8rem] text-paper/60 underline" href={sourceUrl} target="_blank" rel="noopener noreferrer">
            {sourceLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
