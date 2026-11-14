import type { ReactNode } from "react";
import { DocsNav } from "@/components/docs/DocsNav";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-8 pb-16 md:pt-10">
      <div className="grid gap-8 md:grid-cols-[12.5rem_minmax(0,1fr)] md:gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0">
          <DocsNav />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
