import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { LoginBackground } from "./LoginBackground";

export default function LoginPage() {
  return (
    <>
      <LoginBackground />
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </>
  );
}
