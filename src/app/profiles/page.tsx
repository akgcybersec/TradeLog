"use client";

import { TradingProfileManager } from "@/components/profiles/TradingProfileManager";
import { FadeIn, PageTransition } from "@/components/motion/PageTransition";

export default function ProfilesPage() {
  return (
    <PageTransition className="space-y-8">
      <FadeIn>
        <div>
          <h1 className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-2xl font-bold text-transparent">
            Trading Profiles
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Create accounts by broker, set one as default, and start every trade from the right profile.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          <TradingProfileManager />
        </section>
      </FadeIn>
    </PageTransition>
  );
}
