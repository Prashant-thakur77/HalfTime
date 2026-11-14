import type { Metadata } from "next";
import Link from "next/link";
import { SplitFlap } from "@/components/SplitFlap";
import { Stamp } from "@/components/Stamp";
import { Cite, SourceLink } from "@/components/story/Cite";
import { CustodyBar } from "@/components/story/CustodyBar";
import { Reveal } from "@/components/story/Reveal";
import { SOURCES, SOURCE_ORDER, type SourceKey } from "@/components/story/sources";
import { facts, inr } from "@/lib/facts";

export const metadata: Metadata = {
  title: "Why HalfTime exists",
  description:
    "A 2011 Tihar case, the 2024 prison numbers and the law since 2006: why HalfTime reads court papers to find undertrials past the Section 479 line.",
  openGraph: {
    title: "Why HalfTime exists",
    description: "Rs 1,000. Two years. The half line was already law."
  }
};

const H2 = "font-sans text-[length:var(--step-4)] leading-[0.92] font-[780] tracking-[-0.02em] [font-stretch:82%]";
const KICKER = "font-mono text-[0.8rem] tracking-[0.08em] text-ink-3";

function Kicker({ n, children, onInk }: { n: string; children: React.ReactNode; onInk?: boolean }) {
  return (
    <p data-reveal className={`${KICKER} ${onInk ? "text-paper/70" : ""}`}>
      <span className={onInk ? "text-stamp-on-ink" : "text-stamp-text"}>{n}</span> · {children}
    </p>
  );
}

const SCALE: { value: string; label: string; k: SourceKey; flap?: number }[] = [
  { value: inr(facts.undertrials_2024.value), label: "undertrials in India's prisons at the end of 2024", k: facts.undertrials_2024.source as SourceKey },
  { value: `${facts.undertrial_share_2024.value}%`, label: "of everyone in prison had not been convicted", k: facts.undertrial_share_2024.source as SourceKey },
  { value: `${facts.prison_occupancy_2024.value}%`, label: "occupancy: more people than the prisons were built for", k: facts.prison_occupancy_2024.source as SourceKey },
  { value: inr(facts.held_over_2y_2024.value), label: "undertrials held for more than two years", k: facts.held_over_2y_2024.source as SourceKey },
  { value: inr(facts.held_over_5y_2024.value), label: "held for more than five years", k: facts.held_over_5y_2024.source as SourceKey }
];

const FUNNEL: { n: number; label: string; k: SourceKey }[] = [
  { n: facts.identified_479_2024.value, label: "people identified under Section 479 in 2024", k: facts.identified_479_2024.source as SourceKey },
  { n: facts.applications_479_2024.value, label: "applications filed", k: facts.applications_479_2024.source as SourceKey },
  { n: facts.released_479_2024.value, label: "released", k: facts.released_479_2024.source as SourceKey }
];

const TIMELINE: { date: string; title: string; body: React.ReactNode; k: SourceKey[]; mark?: boolean }[] = [
  {
    date: "23 Jun 2006",
    title: "Section 436A, Code of Criminal Procedure",
    body: (
      <>
        Added by Act 25 of 2005, in force from this date. An undertrial detained for up to one-half of the maximum term for the offence is to be
        released by the court on a personal bond. Offences punishable with death are outside it, and no one may be held for longer than the
        maximum term itself.
      </>
    ),
    k: ["crpc436a"]
  },
  {
    date: "9 Jun 2011",
    title: "A Rs 1,000 case, two years in Tihar",
    body: <>The case at the top of this page is reported. The half line had been law for five years.</>,
    k: ["nluDelhi"]
  },
  {
    date: "1 Jul 2024",
    title: "The BNSS replaces the CrPC. Section 479 takes over from 436A.",
    body: (
      <>
        The half line stays. A first-time offender&apos;s line is <strong>one-third</strong> of the maximum. And Section 479(3) puts the duty on the
        jail: on completion of that period, the superintendent shall forthwith apply in writing to the court.
      </>
    ),
    k: ["bnssCommencement", "bnss479"],
    mark: true
  },
  {
    date: "23 Aug 2024",
    title: "The Supreme Court applies 479 to older cases",
    body: <>Section 479 applies to undertrials in cases registered before 1 July 2024 too. Jail superintendents are directed to move the applications through the courts, preferably within three months.</>,
    k: ["scOrder"]
  },
  {
    date: "2024",
    title: `${inr(facts.identified_479_2024.value)} identified. ${inr(facts.applications_479_2024.value)} applications.`,
    body: <>For the whole country, in the first year of the new law, against {inr(facts.undertrials_2024.value)} undertrials.</>,
    k: ["table74"]
  }
];

const USERS: { who: string; does: React.ReactNode; k?: SourceKey }[] = [
  {
    who: "Legal-aid panel lawyers",
    does: <>Sweep a jail&apos;s papers and start the week from a list of who is past the line, each with the quote that puts them there.</>
  },
  {
    who: "District Legal Services Authorities",
    does: <>One sweep before each jail visit, so legal-aid time goes first to the people already past the line.</>
  },
  {
    who: "Jail superintendents",
    does: <>Section 479(3) makes the application their duty. HalfTime drafts it, ready for a lawyer to check and sign.</>,
    k: "bnss479"
  },
  {
    who: "Undertrial Review Committees",
    does: <>Bring a flagged list to the review, with every 479(2) case marked for a lawyer rather than decided.</>
  }
];

export default function StoryPage() {
  return (
    <article className="overflow-x-clip">
      {/* 01 · The case */}
      <section aria-labelledby="story-h" className="relative isolate">
        <Reveal immediate className="relative mx-auto grid max-w-[var(--max)] gap-12 px-[var(--gutter)] pt-12 pb-20 md:grid-cols-12 md:pt-20">
          {/* The half-line: one hard red diagonal, drawn behind the arithmetic. */}
          <svg aria-hidden className="pointer-events-none absolute inset-0 -z-10 h-full w-full max-md:hidden" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line x1="86" y1="0" x2="72" y2="58" stroke="var(--stamp)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="md:col-span-7">
            <Kicker n="01">Why HalfTime exists</Kicker>
            <h1
              id="story-h"
              data-reveal
              className="mt-4 font-sans text-[clamp(3.6rem,0.6rem+11.2vw,13rem)] leading-[0.84] font-[820] tracking-[-0.035em] [font-stretch:72%]"
            >
              <span className="block whitespace-nowrap">Rs 1,000.</span>
              <span className="block whitespace-nowrap text-stamp-text">Two years.</span>
            </h1>
            <div data-reveal className="mt-10 max-w-[36rem] space-y-5 font-serif text-[length:var(--step-1)] leading-[1.5]">
              <p>
                In 2011, members of the legal aid committee at National Law University, Delhi found a 22-year-old in Tihar jail. He came from a
                village near Aligarh. He had been held there for about two years as an{" "}
                <span className="whitespace-nowrap">
                  undertrial.
                  <Cite k="nluDelhi" />
                </span>
              </p>
              <p>
                He was accused of stealing a wallet and of being a wrongful receiver of stolen goods: <strong>Rs 1,000 in all</strong>. Bail was
                Rs 10,000. He could not furnish it.
              </p>
              <p>
                The students arranged a settlement with the alleged victim. The magistrate compounded the case, and he was released on a surety bond.
              </p>
            </div>
          </div>
          <div data-reveal className="self-end md:col-span-5">
            <CustodyBar />
            <p className="mt-6 font-serif text-[1.02rem] leading-relaxed text-ink-2">
              Theft and dishonestly receiving stolen property each carry at most three years.
              <Cite k="ipc" /> The half line was already law: Section 436A of the CrPC, in force since June 2006.
              <Cite k="crpc436a" />
            </p>
          </div>
        </Reveal>
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pb-20">
          <p className="max-w-3xl border-t-2 border-ink pt-6 font-sans text-[length:var(--step-2)] leading-tight font-[700] [font-stretch:88%]">
            He was found because students went looking. HalfTime exists so that finding the next person past the line does not depend on that.
          </p>
        </div>
      </section>

      {/* 02 · The scale */}
      <section aria-labelledby="scale-h" className="register border-y border-ink bg-paper-2 py-24">
        <Reveal className="mx-auto max-w-[var(--max)] px-[var(--gutter)]">
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <Kicker n="02">The scale, 2024</Kicker>
              <h2 id="scale-h" data-reveal className={`mt-3 ${H2}`}>
                It is not one case.
              </h2>
            </div>
            <p data-reveal className="font-serif text-[length:var(--step-1)] leading-snug text-ink-2 md:col-span-5">
              National Crime Records Bureau figures for the end of 2024, the first year Section 479 was in force.
            </p>
          </div>

          <dl className="mt-14 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-6">
            {SCALE.map((x, i) => (
              <div key={x.label} data-reveal className={`flex flex-col justify-between gap-6 bg-paper p-6 ${i < 2 ? "lg:col-span-3" : "lg:col-span-2"} ${i === 0 ? "sm:col-span-2 lg:col-span-3" : ""}`}>
                <dt className="max-w-xs text-[0.98rem] text-ink-2">{x.label}</dt>
                <dd>
                  <span className={`block font-mono leading-none tabular ${i < 2 ? "text-[clamp(2.6rem,7vw,5.6rem)]" : "text-[clamp(2.2rem,4.6vw,3.8rem)]"}`}>{x.value}</span>
                  <SourceLink k={x.k} className="mt-4" />
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-16 grid gap-10 md:grid-cols-12">
            <div data-reveal className="md:col-span-4">
              <h3 className="font-sans text-[length:var(--step-2)] leading-tight font-[750] [font-stretch:88%]">And under the new law, in a year</h3>
              <p className="mt-3 font-serif text-[1.05rem] leading-relaxed text-ink-2">
                Against {inr(facts.held_over_2y_2024.value)} people held for more than two years, these are the Section 479 counts for the whole of 2024.
              </p>
            </div>
            <ol className="grid gap-4 md:col-span-8 md:grid-cols-3">
              {FUNNEL.map((f) => (
                <li key={f.label} data-reveal className="border border-ink bg-paper p-5">
                  <SplitFlap value={f.n} className="text-[clamp(2.4rem,5vw,3.6rem)]" label={inr(f.n)} />
                  <p className="mt-3 font-sans text-[1rem] font-[650]">{f.label}</p>
                  <SourceLink k={f.k} className="mt-3" />
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>

      {/* 03 · The law over time */}
      <section aria-labelledby="law-h" className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-24">
        <Reveal className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="md:sticky md:top-24">
              <Kicker n="03">The law over time</Kicker>
              <h2 id="law-h" data-reveal className={`mt-3 ${H2}`}>
                The line has been law since 2006.
              </h2>
              <p data-reveal className="mt-5 font-serif text-[length:var(--step-1)] leading-snug text-ink-2">
                What changed in 2024 is who must act. The jail now has a written duty to apply.
              </p>
              <Link data-reveal href="/law" className="mt-6 inline-block font-sans text-[0.95rem] underline decoration-carbon-soft underline-offset-4 hover:bg-mark">
                Section 479, plainly
              </Link>
            </div>
          </div>
          <ol className="relative md:col-span-7 md:col-start-6">
            {/* The red half-line, drawn down the register. */}
            <span aria-hidden data-rule="y" className="absolute top-2 bottom-2 left-[7.5rem] w-[2px] origin-top bg-stamp max-sm:left-[0.45rem]" />
            {TIMELINE.map((t) => (
              <li key={t.date} data-reveal className="group relative grid gap-2 border-b border-[var(--rule)] py-8 first:pt-0 sm:grid-cols-[7.5rem_1fr] sm:gap-0 max-sm:pl-8">
                <span aria-hidden className={`absolute top-[2.3rem] left-[7.5rem] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-stamp group-first:top-[0.3rem] max-sm:left-[0.45rem] ${t.mark ? "bg-stamp" : "bg-paper"}`} />
                <p className="font-mono text-[0.9rem] tabular text-stamp-text sm:pr-6">{t.date}</p>
                <div className="sm:pl-8">
                  <h3 className="font-sans text-[length:var(--step-1)] leading-tight font-[720]">{t.title}</h3>
                  <p className="mt-2 font-serif text-[1.08rem] leading-relaxed">{t.body}</p>
                  <div className="mt-3 space-y-1">
                    {t.k.map((k) => (
                      <SourceLink key={k} k={k} />
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* 04 · Who it's for */}
      <section aria-labelledby="who-h" className="on-ink bg-ink py-24 text-paper">
        <Reveal className="mx-auto max-w-[var(--max)] px-[var(--gutter)]">
          <Kicker n="04" onInk>
            Who it is for
          </Kicker>
          <h2 id="who-h" data-reveal className={`mt-3 max-w-4xl ${H2}`}>
            Built for the people who already have the duty.
          </h2>

          <ol data-reveal aria-label="How HalfTime is used" className="mt-12 grid border border-paper/40 md:grid-cols-3">
            {[
              ["Sweep", "A jail's papers in. Every order read, every quote checked."],
              ["Flagged list", "Each person sorted by the law, with the reason on the card."],
              ["479(3) draft", "The application, for a lawyer to check and sign."]
            ].map(([t, d], i) => (
              <li key={t} className="relative border-paper/40 p-5 max-md:border-b max-md:last:border-b-0 md:border-r md:last:border-r-0">
                <span className="font-mono text-[0.85rem] text-stamp-on-ink">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 font-sans text-[length:var(--step-2)] leading-tight font-[750] [font-stretch:88%]">
                  {t}
                  {i < 2 && (
                    <span aria-hidden className="ml-2 text-paper/50 max-md:hidden">
                      →
                    </span>
                  )}
                </p>
                <p className="mt-2 text-[0.95rem] text-paper/80">{d}</p>
              </li>
            ))}
          </ol>

          <ul className="mt-10 grid gap-px bg-paper/25 md:grid-cols-2">
            {USERS.map((u) => (
              <li key={u.who} data-reveal className="bg-ink p-6 md:p-8">
                <h3 className="font-sans text-[length:var(--step-2)] leading-tight font-[720] [font-stretch:92%]">{u.who}</h3>
                <p className="mt-3 max-w-md font-serif text-[1.1rem] leading-relaxed text-paper/90">{u.does}</p>
                {u.k && (
                  <a href={SOURCES[u.k]!.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[0.8rem] text-paper/75 underline underline-offset-2 hover:text-mark">
                    {SOURCES[u.k]!.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p data-reveal className="mt-6 max-w-2xl text-[0.9rem] text-paper/75">
            These are the people HalfTime is built for. None of them uses it yet; a pilot comes next.
          </p>
        </Reveal>
      </section>

      {/* 05 · Never, and next */}
      <section aria-labelledby="never-h" className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-24">
        <Reveal className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-6">
            <Kicker n="05">What it will never do</Kicker>
            <h2 id="never-h" data-reveal className={`mt-3 ${H2}`}>
              It finds. A court decides.
            </h2>
            <ul data-reveal className="mt-8 list-[lower-roman] space-y-3 pl-6 font-serif text-[1.12rem] leading-snug">
              <li>It never releases anyone or tells a court what to do. It drafts paperwork for a lawyer to sign.</li>
              <li>It never settles a 479(2) question. Those cases are flagged for a lawyer.</li>
              <li>It never guesses a maximum term it cannot source. It says “can&apos;t tell”.</li>
            </ul>
            <Link data-reveal href="/#limits-h" className="mt-6 inline-block font-sans text-[0.95rem] underline decoration-carbon-soft underline-offset-4 hover:bg-mark">
              Every limit, stated plainly
            </Link>
          </div>
          <div data-reveal className="ruled relative self-start border border-ink bg-paper-2 py-6 pr-5 pl-14 shadow-[10px_10px_0_var(--carbon)] md:col-span-5 md:col-start-8">
            <h2 className="font-sans text-[length:var(--step-3)] leading-none font-[750] [font-stretch:88%]">Next</h2>
            <ol className="mt-5 space-y-[1.75rem] font-serif text-[1.08rem] leading-[1.75rem]">
              <li>
                <span className="block font-mono text-[0.78rem] text-stamp-text">01 · Pilot</span>
                One District Legal Services Authority, one jail, a sweep before each visit.
              </li>
              <li>
                <span className="block font-mono text-[0.78rem] text-stamp-text">02 · Real orders</span>
                Held-out real bail orders on the{" "}
                <Link href="/results" className="underline">
                  proof page
                </Link>
                , in place of constructed ones.
              </li>
              <li>
                <span className="block font-mono text-[0.78rem] text-stamp-text">03 · The register</span>
                e-Prisons data, so a sweep starts from the jail&apos;s own list of who is inside.
              </li>
            </ol>
            <div aria-hidden className="absolute -top-7 -right-3 rotate-[5deg] max-sm:hidden">
              <Stamp top="SEC 479(3)" main="THE JAIL MUST APPLY" bottom="NOBODY HAS TO ASK" className="text-[0.7rem]" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* Sources */}
      <section aria-labelledby="sources-h" className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pb-24">
        <div className="grid gap-6 border-t border-ink pt-10 md:grid-cols-12">
          <h2 id="sources-h" className="font-sans text-[length:var(--step-2)] font-[750] [font-stretch:88%] md:col-span-3">
            Sources
          </h2>
          <ol className="space-y-2 md:col-span-8 md:col-start-5" data-testid="story-sources">
            {SOURCE_ORDER.map((k, i) => (
              <li key={k} className="grid grid-cols-[2.2rem_1fr] text-[0.92rem]">
                <span className="font-mono text-ink-3">[{i + 1}]</span>
                <a href={SOURCES[k]!.url} target="_blank" rel="noopener noreferrer" className="break-words underline decoration-carbon-soft underline-offset-2 hover:bg-mark">
                  {SOURCES[k]!.label}
                </a>
              </li>
            ))}
          </ol>
          <p className="text-[0.85rem] text-ink-3 md:col-span-8 md:col-start-5">
            The arithmetic in the opening is ours, from the maximum terms in [2]; the 2011 report does not make it. The person in that report is not
            named here. This page is not legal advice.
          </p>
        </div>
      </section>
    </article>
  );
}
