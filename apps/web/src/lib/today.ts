"use client";
import { useEffect, useState } from "react";
import { parseIsoDate } from "@halftime/law";

/** Today, or the "?today=" date the sweep's slider passed along. Read after hydration so pages render statically. */
export function useTodayParam(): string {
  const [today, setToday] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("today");
    if (t && parseIsoDate(t)) setToday(t);
  }, []);
  return today;
}
