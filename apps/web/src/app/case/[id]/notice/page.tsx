import type { Metadata } from "next";
import { NoticePrint } from "@/components/case/NoticePrint";
import { SAMPLES } from "@/lib/cases";

export const metadata: Metadata = { title: "Know your line · notice", robots: { index: false } };

export function generateStaticParams() {
  return SAMPLES.map((s) => ({ id: s.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NoticePrint id={id} />;
}
