"use client";

import { useEffect, useState } from "react";

export function useAuthConfig() {
  const [requireLogin, setRequireLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((data) => setRequireLogin(Boolean(data.requireLogin)))
      .catch(() => setRequireLogin(false))
      .finally(() => setLoading(false));
  }, []);

  return { requireLogin, loading };
}
