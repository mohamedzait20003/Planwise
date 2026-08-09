import type { FC } from "react";

import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ReportSection } from "@/components/landing/report-section";
import { LockingSection } from "@/components/landing/locking-section";
import { ImportSection } from "@/components/landing/import-section";
import { FaqSection } from "@/components/landing/faq-section";

const RootPage: FC = () => {
  return (
    <div className="relative">
      <Hero />
      <HowItWorks />
      <ReportSection />
      <LockingSection />
      <ImportSection />
      <FaqSection />
    </div>
  );
};

export default RootPage;
