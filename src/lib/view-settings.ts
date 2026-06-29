export type ViewDensity = "compact" | "comfortable" | "spacious";
export type DashboardDefaultView = "calendar" | "detailed";

export interface ViewSettings {
  viewFontScale: number;
  viewUiZoom: number;
  viewDensity: ViewDensity;
  reduceMotion: boolean;
  dashboardDefaultView: DashboardDefaultView;
}

export const VIEW_SETTINGS_DEFAULTS: ViewSettings = {
  viewFontScale: 100,
  viewUiZoom: 100,
  viewDensity: "comfortable",
  reduceMotion: false,
  dashboardDefaultView: "calendar",
};

export const VIEW_FONT_SCALE_MIN = 85;
export const VIEW_FONT_SCALE_MAX = 125;
export const VIEW_UI_ZOOM_MIN = 85;
export const VIEW_UI_ZOOM_MAX = 125;

export const DENSITY_OPTIONS: {
  value: ViewDensity;
  label: string;
  description: string;
  spacing: number;
  calendarCell: string;
}[] = [
  { value: "compact", label: "Compact", description: "Tighter spacing, smaller calendar cells", spacing: 0.85, calendarCell: "7rem" },
  { value: "comfortable", label: "Comfortable", description: "Balanced layout (default)", spacing: 1, calendarCell: "8.5rem" },
  { value: "spacious", label: "Spacious", description: "More breathing room", spacing: 1.15, calendarCell: "10rem" },
];

export function clampViewScale(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function parseViewSettings(raw: Partial<ViewSettings> | null | undefined): ViewSettings {
  const density = DENSITY_OPTIONS.find((d) => d.value === raw?.viewDensity)?.value ?? VIEW_SETTINGS_DEFAULTS.viewDensity;

  return {
    viewFontScale: clampViewScale(raw?.viewFontScale ?? VIEW_SETTINGS_DEFAULTS.viewFontScale, VIEW_FONT_SCALE_MIN, VIEW_FONT_SCALE_MAX),
    viewUiZoom: clampViewScale(raw?.viewUiZoom ?? VIEW_SETTINGS_DEFAULTS.viewUiZoom, VIEW_UI_ZOOM_MIN, VIEW_UI_ZOOM_MAX),
    viewDensity: density,
    reduceMotion: raw?.reduceMotion === true || (typeof raw?.reduceMotion === "number" && raw.reduceMotion === 1),
    dashboardDefaultView:
      raw?.dashboardDefaultView === "detailed" ? "detailed" : VIEW_SETTINGS_DEFAULTS.dashboardDefaultView,
  };
}

export function applyViewSettingsToDocument(settings: ViewSettings) {
  if (typeof document === "undefined") return;

  const density = DENSITY_OPTIONS.find((d) => d.value === settings.viewDensity) ?? DENSITY_OPTIONS[1];
  const root = document.documentElement;
  const fontScale = settings.viewFontScale / 100;
  const uiZoom = settings.viewUiZoom / 100;

  // Tailwind spacing/type use rem → scale via html font-size
  root.style.fontSize = `${16 * fontScale}px`;
  root.style.setProperty("--view-font-scale", String(fontScale));
  root.style.setProperty("--view-ui-zoom", String(uiZoom));
  root.style.setProperty("--view-spacing-scale", String(density.spacing));
  root.style.setProperty("--view-calendar-cell-min-height", density.calendarCell);
  root.classList.toggle("view-reduce-motion", settings.reduceMotion);
}

export const VIEW_SETTINGS_CHANGED_EVENT = "view-settings-changed";

export function notifyViewSettingsChanged(settings?: ViewSettings) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<ViewSettings>(VIEW_SETTINGS_CHANGED_EVENT, { detail: settings }));
  }
}
