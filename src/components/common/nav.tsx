"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { LockIcon, LogOutIcon, MenuIcon, MoonIcon, SunIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/common/logo";
import { cn } from "@/lib/utils/utils";

type NavItem = { href: string; label: string };

const appLinks: NavItem[] = [
  { href: "/client/dashboard", label: "Dashboard" },
  { href: "/client/categories", label: "Categories" },
  { href: "/client/plans", label: "Plans" },
  { href: "/client/actuals", label: "Actuals" },
  { href: "/client/report", label: "Report" },
  { href: "/client/periods", label: "Periods" },
];

const adminLinks: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
];

const noopSubscribe = () => () => {};

/** False during SSR and the first client render, true afterwards. */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function NavLink({
  href,
  label,
  active,
}: Readonly<{
  href: string;
  label: string;
  active: boolean;
}>) {
  return (
    <Link
      href={href}
      className="relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200"
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 rounded-full bg-primary/10 ring-1 ring-primary/20"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span
        className={cn(
          "relative z-10 transition-colors duration-200",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Theme is unknown until the client reads storage; render a stable shell first.
  const mounted = useHydrated();

  const isDark = resolvedTheme === "dark";

  // The label must be identical on server and first client render, or React
  // reports a hydration mismatch on the attribute.
  let label = "Toggle theme";
  if (mounted) label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative overflow-hidden rounded-full text-muted-foreground hover:text-foreground"
    >
      {mounted && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 70, scale: 0.6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center"
          >
            {isDark ? (
              <MoonIcon className="size-4" />
            ) : (
              <SunIcon className="size-4" />
            )}
          </motion.span>
        </AnimatePresence>
      )}
    </Button>
  );
}

export function Nav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [lifted, setLifted] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setLifted(y > 12));

  // `role` is written by the next-auth callbacks in domain/infra/auth.ts and
  // declared in types/next-auth.d.ts, so it reads straight off the session.
  const role = session?.user?.role;
  const signedIn = Boolean(session);

  // Signed-out visitors get no nav links — just the logo and the auth actions.
  let links: NavItem[] = [];
  if (role === "ADMIN") links = adminLinks;
  else if (signedIn) links = appLinks;

  const initials =
    session?.user?.name?.slice(0, 2).toUpperCase() ??
    session?.user?.email?.slice(0, 2).toUpperCase() ??
    "?";
  // Same shape as `links` above rather than a nested ternary — three outcomes
  // on one line reads as a puzzle.
  let homeHref = "/";
  if (role === "ADMIN") homeHref = "/admin/dashboard";
  else if (signedIn) homeHref = "/client/dashboard";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <motion.header
      initial={{ y: -72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 30, delay: 0.05 }}
      className="sticky top-0 z-50"
    >
      {/* The bar only gains a border + glass once the page scrolls under it */}
      <div
        className={cn(
          "transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
          lifted
            ? "surface-glass border-b border-border/70"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href={homeHref} className="group shrink-0" aria-label="Planwise home">
            <motion.span
              className="flex"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
            >
              <Logo markClassName="size-7 transition-transform duration-500 group-hover:rotate-[-6deg]" />
            </motion.span>
          </Link>

          <AnimatePresence>
            {role === "ADMIN" && (
              <motion.div
                key="admin-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Badge variant="outline" className="border-primary/40 text-primary">
                  Admin
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          {links.length > 0 && (
            <nav className="ml-2 hidden items-center gap-0.5 md:flex">
              {links.map(({ href, label }, i) => (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.12 + i * 0.05,
                    type: "spring",
                    stiffness: 300,
                    damping: 28,
                  }}
                >
                  <NavLink href={href} label={label} active={isActive(href)} />
                </motion.div>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />

            <AnimatePresence mode="wait" initial={false}>
              {signedIn ? (
                <motion.div
                  key="user-menu"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          type="button"
                          aria-label="Account menu"
                          className="rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
                        />
                      }
                    >
                      <Avatar className="size-8 ring-1 ring-border">
                        {session?.user?.image && (
                          <AvatarImage
                            src={session.user.image}
                            alt={session.user.name ?? ""}
                          />
                        )}
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{session?.user?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {session?.user?.email}
                        </p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        <LogOutIcon />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ) : (
                <motion.div
                  key="auth-buttons"
                  className="hidden items-center gap-2 sm:flex"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    nativeButton={false}
                    render={<Link href="/auth/sign-in" />}
                  >
                    Sign in
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full shadow-sm shadow-primary/25"
                    nativeButton={false}
                    render={<Link href="/auth/sign-up" />}
                  >
                    Get started
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile */}
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Open menu"
                    className="rounded-full md:hidden"
                  />
                }
              >
                <MenuIcon className="size-4" />
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="flex items-center">
                    <Logo markClassName="size-7" />
                  </SheetTitle>
                </SheetHeader>
                {links.length > 0 && (
                  <nav className="flex flex-col gap-1 px-4">
                    {links.map(({ href, label }) => (
                      <SheetClose
                        key={href}
                        render={
                          <Link
                            href={href}
                            className={cn(
                              "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                              isActive(href)
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          />
                        }
                      >
                        {label}
                      </SheetClose>
                    ))}
                  </nav>
                )}
                {!signedIn && (
                  <div className="mt-4 flex flex-col gap-2 px-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      nativeButton={false}
                      render={<Link href="/auth/sign-in" />}
                    >
                      Sign in
                    </Button>
                    <Button
                      className="w-full"
                      nativeButton={false}
                      render={<Link href="/auth/sign-up" />}
                    >
                      Get started
                    </Button>
                  </div>
                )}
                <div className="mt-auto flex items-center gap-2 p-4 text-xs text-muted-foreground">
                  <LockIcon className="size-3.5" />
                  Locked periods are enforced server-side.
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
