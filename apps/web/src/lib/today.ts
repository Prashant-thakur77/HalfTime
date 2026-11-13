"use client";
import { useEffect, useState } from "react";
import { parseIsoDate } from "@halftime/law";

/** The date the static pages were rendered with. The first client render must match it. */
export const BUILD_DATE = process.env.BUILD_DATE ?? "2026-11-15";

/** The real today, switched in after hydration so server and client HTML match. */
export function useToday(): string {
  const [today, setToday] = useState(BUILD_DATE);
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), []);
  return today;
}

/** Today, or the "?today=" date the sweep's slider passed along. */
export function useTodayParam(): string {
  const [today, setToday] = useState(BUILD_DATE);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("today");
    setToday(t && parseIsoDate(t) ? t : new Date().toISOString().slice(0, 10));
  }, []);
  return today;
}
