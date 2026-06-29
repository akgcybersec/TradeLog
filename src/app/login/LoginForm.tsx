"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { BookOpen, LogIn, Loader2, TrendingUp } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 360, damping: 26 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 280, damping: 24, delay: 0.05 },
  },
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";
  const reduce = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      window.location.assign(data.mustChangeCredentials ? "/change-credentials" : from);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25";

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        variants={reduce ? undefined : cardVariants}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="relative w-full max-w-md"
      >
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent opacity-80" />
        <div className="absolute -inset-4 rounded-3xl bg-emerald-500/5 blur-2xl" />

        <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />

          <motion.div
            variants={reduce ? undefined : container}
            initial={reduce ? false : "hidden"}
            animate="show"
          >
            <motion.div variants={reduce ? undefined : item} className="mb-8 text-center">
              <motion.div
                className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center"
                animate={reduce ? undefined : { y: [0, -4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-md" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                  <BookOpen className="h-7 w-7 text-emerald-400" />
                </div>
                <motion.div
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950"
                  initial={reduce ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.5 }}
                >
                  <TrendingUp className="h-3 w-3" />
                </motion.div>
              </motion.div>
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-100">TradeLog</h1>
              <p className="mt-2 text-sm text-slate-400">Sign in to your trading journal</p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div variants={reduce ? undefined : item}>
                <label className="mb-2 block text-sm font-medium text-slate-400">Email</label>
                <motion.input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  whileFocus={reduce ? undefined : { scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              </motion.div>

              <motion.div variants={reduce ? undefined : item}>
                <label className="mb-2 block text-sm font-medium text-slate-400">Password</label>
                <motion.input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  whileFocus={reduce ? undefined : { scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              </motion.div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    className="overflow-hidden rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div variants={reduce ? undefined : item}>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  whileHover={reduce || loading ? undefined : { scale: 1.02, backgroundColor: "#10b981" }}
                  whileTap={reduce || loading ? undefined : { scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  {!reduce && !loading && (
                    <motion.span
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                    />
                  )}
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Sign in
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
