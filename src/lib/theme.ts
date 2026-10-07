export type ThemePreference = 'light' | 'dark' | 'system';
export type Theme = Exclude<ThemePreference, 'system'>;

export const THEME_STORAGE_KEY = 'oar-theme';
export const THEME_MEDIA = '(prefers-color-scheme: dark)';
export const THEME_COLORS = { light: '#F5F8FC', dark: '#07111F' } as const;

export function themePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): Theme {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}

export function applyTheme(preference: ThemePreference, systemDark: boolean) {
  const theme = resolveTheme(preference, systemDark);
  document.documentElement.dataset.theme = theme;
  // Keep browser chrome in sync even when an explicit choice overrides the device.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => {
    meta.content = THEME_COLORS[theme];
  });
}

// Runs in the document head, before paint. Storage can be blocked in private/wallet browsers.
// Only fixed application strings enter the script; no user input is interpolated.
export const THEME_INIT_SCRIPT = `(() => {
  let preference = 'system';
  try { const saved = localStorage.getItem('${THEME_STORAGE_KEY}'); if (saved === 'light' || saved === 'dark') preference = saved; } catch {}
  const dark = preference === 'dark' || (preference === 'system' && matchMedia('${THEME_MEDIA}').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => { meta.content = dark ? '${THEME_COLORS.dark}' : '${THEME_COLORS.light}'; });
})();`;
