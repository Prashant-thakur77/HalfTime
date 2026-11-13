import { facts, inr } from "@/lib/facts";

/** The live strip at the top: the national numbers, always from facts.json. */
export function Ticker() {
  const items = [
    `${inr(facts.undertrials_2024.value)} undertrials in India's prisons (NCRB 2024)`,
    `${facts.undertrial_share_2024.value}% of all prisoners have not been convicted`,
    `${inr(facts.identified_479_2024.value)} people identified under Sec 479 in 2024`,
    `${inr(facts.applications_479_2024.value)} applications filed`,
    `${inr(facts.held_over_2y_2024.value)} held more than 2 years`,
    `Prisons at ${facts.prison_occupancy_2024.value}% of capacity`
  ];
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((t) => (
        <li key={t} className="flex items-center gap-3 pr-10 whitespace-nowrap">
          <span className="inline-block h-1.5 w-1.5 bg-stamp" aria-hidden />
          <span className="font-mono text-[0.72rem] tracking-wide">{t}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="group relative z-40 overflow-hidden bg-carbon text-paper" role="region" aria-label="National figures">
      <div className="flex w-max py-1.5 [animation:ticker_60s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:[animation:none]">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
