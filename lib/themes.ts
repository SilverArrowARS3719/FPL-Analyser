export type ThemeName = "sunset" | "ocean" | "forest" | "grape";

export interface ThemeDef {
  name: ThemeName;
  label: string;
  swatch: string;
}

export const THEMES: ThemeDef[] = [
  { name: "sunset", label: "Sunset", swatch: "linear-gradient(135deg, #ff9a76, #ff6b4a)" },
  { name: "ocean", label: "Ocean", swatch: "linear-gradient(135deg, #6ee7f0, #0891b2)" },
  { name: "forest", label: "Forest", swatch: "linear-gradient(135deg, #86efac, #16a34a)" },
  { name: "grape", label: "Grape", swatch: "linear-gradient(135deg, #d8b4fe, #9333ea)" },
];

export const DEFAULT_THEME: ThemeName = "sunset";
export const THEME_STORAGE_KEY = "fpl-analyser-theme";

export function isThemeName(value: string | null): value is ThemeName {
  return !!value && THEMES.some((t) => t.name === value);
}
