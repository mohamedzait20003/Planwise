"use client";

import { motion } from "framer-motion";
import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { cn } from "@/lib/utils/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export function PasswordField({
  name,
  label = "Password",
  placeholder = "••••••••",
  autoComplete = "current-password",
  hint,
  value,
  onChange,
}: Readonly<{
  name: string;
  label?: string;
  placeholder?: string;
  autoComplete?: string;
  hint?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
}>) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {visible ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </button>
      </div>
      {hint}
    </div>
  );
}

const BANDS = [
  { label: "Too short", tone: "bg-unfavorable" },
  { label: "Weak", tone: "bg-unfavorable" },
  { label: "Fair", tone: "bg-locked" },
  { label: "Good", tone: "bg-chart-2" },
  { label: "Strong", tone: "bg-favorable" },
] as const;

/**
 * Rough strength signal.
 *
 * Length is weighted heaviest because it is what actually resists a brute
 * force; variety is scored, but only as a nudge. This is feedback, not a gate —
 * the server enforces the single rule that matters, an 8-character minimum.
 */
function score(password: string): number {
  if (password.length < 8) return 0;

  let points = 1;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;

  const variety =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/\d/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));
  if (variety >= 3) points += 1;

  return Math.min(points, BANDS.length - 1);
}

export function PasswordStrength({ value }: Readonly<{ value: string }>) {
  if (!value) return null;

  const level = score(value);
  const band = BANDS[level];

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1">
        {BANDS.slice(1).map((_, index) => (
          <motion.span
            key={BANDS[index + 1].label}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              index < level ? band.tone : "bg-muted"
            )}
            initial={false}
            animate={{ scaleX: 1 }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {value.length < 8 ? "At least 8 characters" : band.label}
      </p>
    </div>
  );
}
