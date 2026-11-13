import raw from "@/data/facts.json";

export interface EvalReport {
  [k: string]: unknown;
}

type Fact<T> = { value: T; source: string; unit?: string };

export const facts = raw as unknown as {
  sources: Record<string, { label: string; url: string }>;
  undertrials_2024: Fact<number>;
  undertrial_share_2024: Fact<number>;
  prison_occupancy_2024: Fact<number>;
  identified_479_2024: Fact<number>;
  applications_479_2024: Fact<number>;
  released_479_2024: Fact<number>;
  held_over_2y_2024: Fact<number>;
  held_over_5y_2024: Fact<number>;
  sc_order_date: Fact<string>;
  eval: EvalReport | null;
};

/** Indian digit grouping: 371440 -> 3,71,440. */
export function inr(n: number): string {
  return n.toLocaleString("en-IN");
}
