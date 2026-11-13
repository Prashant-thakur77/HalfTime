import type { Metadata } from "next";
import { CaseView } from "@/components/case/CaseView";
import { SAMPLES } from "@/lib/cases";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = SAMPLES.find((x) => x.id === id);
  return s
    ? { title: `${s.title} · constructed sample`, description: s.gloss }
    : { title: "Case", robots: { index: false } };
}

export function generateStaticParams() {
  return SAMPLES.map((s) => ({ id: s.id }));
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseView id={id} />;
}
