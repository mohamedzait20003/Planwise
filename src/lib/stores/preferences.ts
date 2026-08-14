"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { CALENDAR_YEAR_START, currentMonth, isTimeZone } from "@/lib/utils/month";

/**
 * Settings that belong to the browser rather than the account.
 *
 * Both of these are reading preferences: they change how a range is labelled,
 * cut, or which month counts as "now", and they change no stored figure. That
 * is why they live here and not on `User` — a column would mean a schema change
 * to record something no server code reads.
 *
 * The trade is real and worth stating: they do not follow the user to another
 * browser. If either ever has to agree across devices — or if anything
 * server-side starts deriving quarters or "this month" — they become columns
 * and this store becomes their cache.
 */
export type Preferences = {
  fiscalYearStart: number;
  setFiscalYearStart: (month: number) => void;

  timeZone: string | null;
  setTimeZone: (zone: string | null) => void;
};

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      fiscalYearStart: CALENDAR_YEAR_START,
      setFiscalYearStart: (month) => set({ fiscalYearStart: Math.min(Math.max(Math.trunc(month), 1), 12) }),

      timeZone: null,
      setTimeZone: (zone) => set({ timeZone: zone && isTimeZone(zone) ? zone : null }),
    }),
    {
      name: "planwise.preferences",
      skipHydration: true,
      partialize: (state) => ({
        fiscalYearStart: state.fiscalYearStart,
        timeZone: state.timeZone,
      }),
    }
  )
);

export function rehydratePreferences() {
  return usePreferences.persist.rehydrate();
}

export function useCurrentMonth(): string {
  const timeZone = usePreferences((state) => state.timeZone);
  return currentMonth(timeZone);
}
