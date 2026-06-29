"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  applyViewSettingsToDocument,
  parseViewSettings,
  VIEW_SETTINGS_CHANGED_EVENT,
  VIEW_SETTINGS_DEFAULTS,
  type ViewSettings,
} from "@/lib/view-settings";

interface ViewSettingsContextValue {
  viewSettings: ViewSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ViewSettingsContext = createContext<ViewSettingsContextValue>({
  viewSettings: VIEW_SETTINGS_DEFAULTS,
  loading: true,
  refresh: async () => {},
});

export function ViewSettingsProvider({ children }: { children: React.ReactNode }) {
  const [viewSettings, setViewSettings] = useState<ViewSettings>(VIEW_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      const parsed = parseViewSettings(data);
      setViewSettings(parsed);
      applyViewSettingsToDocument(parsed);
    } catch {
      applyViewSettingsToDocument(VIEW_SETTINGS_DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ViewSettings>).detail;
      if (detail) {
        const parsed = parseViewSettings(detail);
        setViewSettings(parsed);
        applyViewSettingsToDocument(parsed);
        return;
      }
      refresh();
    };
    window.addEventListener(VIEW_SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(VIEW_SETTINGS_CHANGED_EVENT, handler);
  }, [refresh]);

  useEffect(() => {
    applyViewSettingsToDocument(viewSettings);
  }, [viewSettings]);

  const value = useMemo(
    () => ({ viewSettings, loading, refresh }),
    [viewSettings, loading, refresh],
  );

  return <ViewSettingsContext.Provider value={value}>{children}</ViewSettingsContext.Provider>;
}

export function useViewSettings() {
  return useContext(ViewSettingsContext);
}
