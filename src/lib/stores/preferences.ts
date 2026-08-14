"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { CALENDAR_YEAR_START } from "@/lib/utils/month";

export type Preferences = {
  fiscalYearStart: number;
  setFiscalYearStart: (month: number) => void;
};

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      fiscalYearStart: CALENDAR_YEAR_START,
      setFiscalYearStart: (month) => set({ fiscalYearStart: Math.min(Math.max(Math.trunc(month), 1), 12) }),
    }),
    {
      name: "planwise.preferences",
      skipHydration: true,
      partialize: (state) => ({ fiscalYearStart: state.fiscalYearStart }),
    }
  )
);

export function rehydratePreferences() {
  return usePreferences.persist.rehydrate();
}
