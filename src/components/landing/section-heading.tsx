import { Badge } from "@/components/ui/badge";
import { Reveal } from "./motion-primitives";
import { cn } from "@/lib/utils/utils";

/** Shared heading block: eyebrow badge, title, optional lede. */
export function SectionHeading({
  eyebrow,
  title,
  children,
  align = "center",
  className,
}: Readonly<{
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  /** `start` is for sections whose heading sits in a column beside content. */
  align?: "center" | "start";
  className?: string;
}>) {
  const centered = align === "center";

  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        centered ? "mx-auto text-center" : "text-left",
        className
      )}
    >
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
