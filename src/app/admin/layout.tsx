import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Console", template: "%s · Planwise Admin" },
};

/**
 * The operator's shell.
 *
 * Same aurora and grid as the workspace, on a wider container. The client
 * screens are one person reading their own figures and are measured for reading
 * length; these are tables of every account on the platform, and cramming them
 * into the same column would buy nothing but horizontal scrolling.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-grid absolute inset-0 mask-[radial-gradient(ellipse_70%_45%_at_50%_0%,black,transparent)]" />
        <div className="animate-aurora absolute -top-40 left-1/2 h-96 w-208 -translate-x-1/2 rounded-full bg-primary/12 blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        {children}
      </div>
    </div>
  );
}
