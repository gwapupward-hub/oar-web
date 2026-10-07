'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Sun, SunMoon } from 'lucide-react';
import { applyTheme, THEME_MEDIA, THEME_STORAGE_KEY, themePreference, type ThemePreference } from '@/lib/theme';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const;

export function ThemeSettings() {
  const [preference, setPreference] = useState<ThemePreference | null>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  // The ref keeps live media/storage listeners in sync without reinstalling them.
  const current = useRef<ThemePreference>('system');

  useEffect(() => {
    const media = window.matchMedia(THEME_MEDIA);
    const sync = (next: ThemePreference) => {
      current.current = next;
      setPreference(next);
      applyTheme(next, media.matches);
    };
    let saved: string | null = null;
    try { saved = localStorage.getItem(THEME_STORAGE_KEY); } catch {}
    sync(themePreference(saved));

    const onMedia = () => applyTheme(current.current, media.matches);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
      // Ignore sessionStorage events, which must not change the persisted appearance.
      try { if (event.storageArea !== localStorage) return; } catch { return; }
      sync(themePreference(event.newValue));
    };
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.current?.contains(event.target) && details.current) {
        details.current.open = false;
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && details.current?.open) {
        details.current.open = false;
        trigger.current?.focus();
      }
    };
    media.addEventListener('change', onMedia);
    window.addEventListener('storage', onStorage);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      media.removeEventListener('change', onMedia);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function choose(next: ThemePreference) {
    current.current = next;
    setPreference(next);
    applyTheme(next, window.matchMedia(THEME_MEDIA).matches);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch {}
  }

  const Icon = OPTIONS.find(option => option.value === preference)?.Icon ?? SunMoon;
  return (
    <details className="theme-settings" ref={details} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
    }}>
      <summary ref={trigger} className="theme-trigger" aria-label="Appearance settings" title="Appearance settings">
        <Icon size={18} aria-hidden="true" />
        <span className="theme-trigger-label">Appearance</span>
      </summary>
      <div className="theme-panel">
        <p className="theme-title">Appearance</p>
        <p className="small muted">Choose how OAR looks on this device.</p>
        <div className="theme-options" role="group" aria-label="Color theme">
          {OPTIONS.map(({ value, label, Icon: OptionIcon }) => (
            <button key={value} type="button" className="theme-option" aria-pressed={preference === value} onClick={() => choose(value)}>
              <OptionIcon size={18} aria-hidden="true" />
              <span>{label}</span>
              <Check className="theme-check" size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="theme-hint small muted" role="status">
          {preference === 'system' || preference === null ? 'Follows your device’s light or dark setting.' : `${preference === 'light' ? 'Light' : 'Dark'} mode selected.`}
        </p>
      </div>
    </details>
  );
}
