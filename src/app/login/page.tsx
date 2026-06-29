import { Suspense } from "react";
import { LoginGate } from "./LoginGate";
import { LoginBackground } from "./LoginBackground";

export default function LoginPage() {
  return (
    <div className="relative z-10">
      <LoginBackground />
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>}>
        <LoginGate />
      </Suspense>
    </div>
  );
}
