"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookOpen, LogIn, LogOut, Menu, X } from "lucide-react";
import { NavLinks } from "@/components/layout/NavLinks";
import { useAuthConfig } from "@/hooks/useAuthConfig";

function AuthNavAction({
  requireLogin,
  isLoggedIn,
  onLogout,
  onNavigate,
}: {
  requireLogin: boolean;
  isLoggedIn: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  if (isLoggedIn) {
    return (
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-200"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    );
  }

  return (
    <Link
      href="/login"
      onClick={onNavigate}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-200"
    >
      <LogIn className="h-4 w-4" />
      {requireLogin ? "Sign in" : "Sign in (optional)"}
    </Link>
  );
}

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { requireLogin, isLoggedIn, loading } = useAuthConfig();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-500" />
          <span className="font-mono text-base font-bold text-slate-100">TradeLog</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer rounded-lg border border-slate-800 p-2 text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 cursor-default bg-black/60 lg:hidden"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={reduce ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-slate-800 bg-slate-950 lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-500" />
                  <span className="font-mono text-base font-bold text-slate-100">Menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-lg p-2 text-slate-400 hover:text-slate-200"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                <NavLinks layoutId="mobile-nav-active" onNavigate={() => setOpen(false)} />
              </nav>
              {!loading && (
                <div className="border-t border-slate-800 p-3">
                  <AuthNavAction
                    requireLogin={requireLogin}
                    isLoggedIn={isLoggedIn}
                    onLogout={handleLogout}
                    onNavigate={() => setOpen(false)}
                  />
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
