"use client";

import { motion, useReducedMotion } from "motion/react";

const ORBS: { className: string; duration: number; x: number[]; y: number[] }[] = [
  { className: "left-[10%] top-[15%] h-72 w-72 bg-emerald-500/20", duration: 22, x: [0, 40, 0], y: [0, -30, 0] },
  { className: "right-[5%] top-[35%] h-96 w-96 bg-teal-600/15", duration: 28, x: [0, -50, 0], y: [0, 40, 0] },
  { className: "bottom-[10%] left-[35%] h-80 w-80 bg-emerald-400/10", duration: 25, x: [0, 35, 0], y: [0, -25, 0] },
];

export function LoginBackground() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(16,185,129,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 80%, rgba(6,95,70,0.12), transparent 50%), radial-gradient(ellipse 60% 40% at 0% 60%, rgba(15,118,110,0.1), transparent 45%), linear-gradient(180deg, #020617 0%, #0a0f1a 50%, #020617 100%)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 75%)",
        }}
      />

      {!reduce &&
        ORBS.map((orb, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full blur-3xl ${orb.className}`}
            animate={{ x: orb.x, y: orb.y }}
            transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.07]"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="login-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
            <stop offset="40%" stopColor="#22c55e" stopOpacity="1" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {reduce ? (
          <path
            d="M0,520 C120,480 200,560 320,440 S520,380 640,420 S880,300 1200,360"
            fill="none"
            stroke="url(#login-line)"
            strokeWidth="2"
          />
        ) : (
          <motion.path
            d="M0,520 C120,480 200,560 320,440 S520,380 640,420 S880,300 1200,360"
            fill="none"
            stroke="url(#login-line)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2.2, ease: "easeOut", delay: 0.3 }}
          />
        )}
        <path
          d="M0,520 C120,480 200,560 320,440 S520,380 640,420 S880,300 1200,360 L1200,800 L0,800 Z"
          fill="url(#login-line)"
          opacity="0.15"
        />
      </svg>

      {!reduce && (
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
          transition={{ duration: 30, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(34,197,94,0.08) 0%, transparent 25%), radial-gradient(circle at 80% 70%, rgba(20,184,166,0.06) 0%, transparent 25%)",
            backgroundSize: "200% 200%",
          }}
        />
      )}

      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px]" />
    </div>
  );
}
