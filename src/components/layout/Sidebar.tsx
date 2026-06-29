"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { BookOpen, LogIn, LogOut } from "lucide-react";
import { NavLinks } from "@/components/layout/NavLinks";
import { useAuthConfig } from "@/hooks/useAuthConfig";

export function Sidebar() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { requireLogin, loading } = useAuthConfig();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <motion.aside
      initial={reduce ? false : { x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950 lg:flex"
    >
      <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-5">
        <BookOpen className="h-6 w-6 text-emerald-500" />
        <span className="font-mono text-lg font-bold text-slate-100">TradeLog</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <NavLinks />
      </nav>
      {!loading && (
        <div className="border-t border-slate-800 p-3">
          {requireLogin ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-200"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-200"
            >
              <LogIn className="h-4 w-4" />
              Sign in (optional)
            </Link>
          )}
        </div>
      )}
    </motion.aside>
  );
}
