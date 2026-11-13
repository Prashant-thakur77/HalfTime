import type { Metadata } from "next";
import { SweepBoard } from "@/components/sweep/SweepBoard";

export const metadata: Metadata = {
  title: "Run a jail sweep",
  description: "Sweep a sample jail's court papers: every person sorted into past the line, not yet, can't tell, or outside Section 479."
};

export default function SweepPage() {
  return (
    <div className="pt-10 pb-10">
      <SweepBoard />
    </div>
  );
}
