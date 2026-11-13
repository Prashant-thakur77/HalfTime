import Link from "next/link";
import { facts } from "@/lib/facts";
import { BigWordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="on-ink relative mt-24 overflow-hidden bg-ink text-paper">
      <div className="mx-auto grid max-w-[var(--max)] gap-10 px-[var(--gutter)] pt-16 pb-6 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-serif text-[length:var(--step-2)] leading-tight">
            The law already says go home. Someone has to read the papers.
          </p>
          <p className="mt-6 max-w-md text-[0.9rem] text-paper/75">
            HalfTime is a screening aid, not legal advice. Every result is a draft for a legal-aid lawyer to check and sign. Sample
            orders on this site are constructed for demonstration; names are masked.
          </p>
        </div>
        <nav aria-label="Footer" className="md:col-span-3 md:col-start-7">
          <ul className="space-y-1 font-serif text-[1.35rem]">
            <li><Link className="hover:text-mark" href="/sweep">Run a jail sweep</Link></li>
            <li><Link className="hover:text-mark" href="/vs-chatbot">Chatbot vs HalfTime</Link></li>
            <li><Link className="hover:text-mark" href="/results">Proof and misses</Link></li>
            <li><Link className="hover:text-mark" href="/law">Section 479, plainly</Link></li>
          </ul>
        </nav>
        <div className="text-[0.8rem] text-paper/70 md:col-span-3">
          <p className="caps mb-2 text-paper/90">Sources</p>
          <ul className="space-y-1.5">
            {["ncrb", "table74", "scOrder", "bnss479"].map((k) => (
              <li key={k}>
                <a className="underline decoration-paper/30 underline-offset-2 hover:text-mark" href={facts.sources[k]!.url} rel="noopener noreferrer" target="_blank">
                  {facts.sources[k]!.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <BigWordmark variant="outline" className="translate-y-[14%] px-[var(--gutter)]" />
    </footer>
  );
}
