import "./globals.css";

import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";

import { Providers } from "./providers";
import { LayoutShell } from "@/components/common/layout-shell";
import { cn } from "@/lib/utils/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Planwise — Plan vs Actual, without the spreadsheet",
    template: "%s · Planwise",
  },
  description:
    "Set monthly spending targets per category, log what you actually spent, and see variance the moment it happens. Lock a period and the numbers stop moving.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // next-themes writes the theme class here before paint
      suppressHydrationWarning
      // Next 16 no longer overrides scroll-behavior during navigation unless asked
      data-scroll-behavior="smooth"
      className={cn(
        "h-full",
        inter.variable,
        instrumentSerif.variable,
        jetbrainsMono.variable
      )}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
