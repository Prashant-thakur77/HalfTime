import type { Metadata } from "next";
import { Suspense } from "react";
import { CaseView } from "@/components/case/CaseView";
import { SAMPLES } from "@/lib/cases";

export const metadata: Metadata = { title: "Case", robots: { index: false } };

export function generateStaticParams() {
  return SAMPLES.map((s) => ({ id: s.id }));
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="px-[var(--gutter)] py-20 font-mono">Opening the file…</p>}>
      <CaseView id={id} />
    </Suspense>
  );
}
