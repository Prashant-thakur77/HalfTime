import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationPrint } from "@/components/case/ApplicationPrint";
import { SAMPLES } from "@/lib/cases";

export const metadata: Metadata = { title: "Sec 479(3) application draft", robots: { index: false } };

export function generateStaticParams() {
  return SAMPLES.map((s) => ({ id: s.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <ApplicationPrint id={id} />
    </Suspense>
  );
}
