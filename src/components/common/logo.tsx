import { cn } from "@/lib/utils/utils";

/**
 * The mark encodes the product: three actual-spend bars measured against a
 * horizontal plan line. The middle bar breaks through the line (over plan),
 * the outer two sit under it (under plan).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Planwise"
      className={cn("size-8", className)}
    >
      <defs>
        <linearGradient id="pw-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--chart-1)" />
          <stop offset="55%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--chart-2)" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="9" fill="url(#pw-mark)" />

      {/* Actual spend */}
      <g fill="var(--primary-foreground)">
        <rect x="7.6" y="19" width="4.2" height="6" rx="1.6" opacity="0.75" />
        <rect x="13.9" y="10.5" width="4.2" height="14.5" rx="1.6" />
        <rect x="20.2" y="16.8" width="4.2" height="8.2" rx="1.6" opacity="0.75" />
      </g>

      {/* Plan line */}
      <rect
        x="5.6"
        y="14.7"
        width="20.8"
        height="1.8"
        rx="0.9"
        fill="var(--primary-foreground)"
        opacity="0.55"
      />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="text-[15px] font-semibold tracking-tight">
        Plan<span className="text-primary">wise</span>
      </span>
    </span>
  );
}
