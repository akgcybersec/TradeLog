"use client";

import { useEffect, useState } from "react";
import { LoginAccountSetup } from "@/components/auth/LoginAccountSetup";
import { LoginForm } from "./LoginForm";

export function LoginGate() {
  const [mode, setMode] = useState<"loading" | "setup" | "login">("loading");

  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((data: { requireLogin?: boolean; hasUser?: boolean }) => {
        if (data.requireLogin && !data.hasUser) {
          setMode("setup");
        } else {
          setMode("login");
        }
      })
      .catch(() => setMode("login"));
  }, []);

  if (mode === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  if (mode === "setup") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <LoginAccountSetup
            enableLogin
            onSuccess={() => {
              window.location.href = "/login";
            }}
          />
        </div>
      </div>
    );
  }

  return <LoginForm />;
}
