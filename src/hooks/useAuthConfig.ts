"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export const AUTH_CONFIG_CHANGED = "tradelog:auth-config-changed";

export function notifyAuthConfigChanged() {
  window.dispatchEvent(new Event(AUTH_CONFIG_CHANGED));
}

export function useAuthConfig() {
  const pathname = usePathname();
  const [requireLogin, setRequireLogin] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/auth/config", { cache: "no-store" }),
      fetch("/api/auth/me", { cache: "no-store" }),
    ])
      .then(async ([configRes, meRes]) => {
        const config = (await configRes.json()) as { requireLogin?: boolean; hasUser?: boolean };
        setRequireLogin(Boolean(config.requireLogin));
        setHasUser(Boolean(config.hasUser));
        if (meRes.ok) {
          const me = (await meRes.json()) as { user?: unknown };
          setIsLoggedIn(Boolean(me.user));
        } else {
          setIsLoggedIn(false);
        }
      })
      .catch(() => {
        setRequireLogin(false);
        setHasUser(false);
        setIsLoggedIn(false);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(AUTH_CONFIG_CHANGED, refresh);
    return () => window.removeEventListener(AUTH_CONFIG_CHANGED, refresh);
  }, [refresh, pathname]);

  return { requireLogin, hasUser, isLoggedIn, loading, refresh };
}
