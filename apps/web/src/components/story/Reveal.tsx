"use client";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger, CustomEase);

/**
 * One scroll reveal per section, played once. Children marked `data-reveal`
 * rise like heavy paper; an element marked `data-rule` draws in along its
 * axis (the red half-line). Without JS, or with reduced motion, everything
 * is simply there.
 */
export function Reveal({ children, className = "", as: Tag = "div", immediate = false }: { children: React.ReactNode; className?: string; as?: "div" | "section"; immediate?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const paper = CustomEase.create("paper", "0.65,0,0.15,1");
      const items = el.querySelectorAll<HTMLElement>("[data-reveal]");
      const rules = el.querySelectorAll<HTMLElement>("[data-rule]");
      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: paper, duration: 0.9 }
      });
      if (items.length) tl.from(items, { y: 36, opacity: 0, stagger: 0.09, clearProps: "transform,opacity" }, 0);
      rules.forEach((r) => {
        const axis = r.dataset.rule === "x" ? "scaleX" : "scaleY";
        tl.from(r, { [axis]: 0, duration: 1.1, clearProps: "transform" }, 0.1);
      });
      if (immediate) {
        tl.play();
        return () => tl.kill();
      }
      const st = ScrollTrigger.create({ trigger: el, start: "top 82%", once: true, onEnter: () => tl.play() });
      return () => {
        st.kill();
        tl.kill();
      };
    });
    return () => mm.revert();
  }, [immediate]);
  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement>} className={className}>
      {children}
    </Tag>
  );
}
