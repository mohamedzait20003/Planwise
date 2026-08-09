import { Badge } from "@/components/ui/badge";
import { Reveal } from "./motion-primitives";

/** Shared centred heading block: eyebrow badge, title, optional lede. */
export function SectionHeading({
  eyebrow,
  title,
  children,
}: Readonly<{ eyebrow: string; title: string; children?: React.ReactNode }>) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <Badge
        variant="secondary"
        className="mb-4 h-6 px-3 text-[11px] tracking-wide uppercase"
      >
        {eyebrow}
      </Badge>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {children && (
        <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground">
          {children}
        </p>
      )}
    </Reveal>
  );
}
