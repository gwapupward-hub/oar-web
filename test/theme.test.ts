import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { applyTheme, resolveTheme, THEME_COLORS, THEME_INIT_SCRIPT, THEME_STORAGE_KEY, themePreference } from '../src/lib/theme';

function boot(saved: string | null, deviceDark: boolean, blockedStorage = false) {
  const root = { dataset: {} as Record<string, string> };
  const chrome = [{ content: 'initial-dark' }, { content: 'initial-light' }];
  runInNewContext(THEME_INIT_SCRIPT, {
    localStorage: { getItem(key: string) {
      assert.equal(key, THEME_STORAGE_KEY);
      if (blockedStorage) throw new Error('Storage denied');
      return saved;
    } },
    matchMedia: () => ({ matches: deviceDark }),
    document: { documentElement: root, querySelectorAll: () => chrome },
  });
  return { theme: root.dataset.theme, chrome: chrome.map(meta => meta.content) };
}

test('saved light/dark override either device setting before paint, including browser chrome', () => {
  for (const preference of ['light', 'dark'] as const) {
    for (const deviceDark of [false, true]) {
      assert.deepEqual(boot(preference, deviceDark), { theme: preference, chrome: [THEME_COLORS[preference], THEME_COLORS[preference]] });
    }
  }
});

test('new visitors, System, invalid values and unavailable storage fall back to the device', () => {
  for (const saved of [null, 'system', 'invalid']) {
    for (const deviceDark of [false, true]) {
      const theme = deviceDark ? 'dark' : 'light';
      assert.equal(boot(saved, deviceDark).theme, theme);
      assert.equal(themePreference(saved), 'system');
      assert.equal(resolveTheme(themePreference(saved), deviceDark), theme);
      assert.equal(boot('dark', deviceDark, true).theme, theme);
    }
  }
});

test('switching themes updates the page and browser chrome without inline styles or storage access', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const root = { dataset: {} as Record<string, string> };
  const chrome = [{ content: '' }, { content: '' }];
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: root, querySelectorAll: () => chrome } });
  try {
    applyTheme('dark', false);
    assert.equal(root.dataset.theme, 'dark');
    assert.equal(chrome[0].content, THEME_COLORS.dark);
    applyTheme('light', true);
    assert.equal(root.dataset.theme, 'light');
    assert.equal(chrome[0].content, THEME_COLORS.light);
    applyTheme('system', true);
    assert.equal(root.dataset.theme, 'dark');
    applyTheme('system', false);
    assert.equal(root.dataset.theme, 'light');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
