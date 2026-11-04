import { useSyncExternalStore } from 'react';

export type ThemePref = 'system' | 'dark' | 'light';
export type Intensity = 'full' | 'calm' | 'off';
export type Density = 'comfortable' | 'compact';
export type ChatWidth = 'narrow' | 'medium' | 'wide';

export interface AudioPrefs {
  master: boolean;
  click: boolean;
  notify: boolean;
  mascot: boolean;
  music: boolean;
  sfxVolume: number; // 0..1
  musicVolume: number; // 0..1
}

export interface Prefs {
  theme: ThemePref;
  intensity: Intensity;
  reducedMotion: boolean; // user forced, in addition to the OS setting
  density: Density;
  chatWidth: ChatWidth;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  contextPanel: boolean;
  focusMode: boolean;
  audio: AudioPrefs;
}

export const SIDEBAR_MIN = 232;
export const SIDEBAR_MAX = 420;

/** Everything audio-related is OFF by default. */
export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  intensity: 'full',
  reducedMotion: false,
  density: 'comfortable',
  chatWidth: 'medium',
  sidebarWidth: 280,
  sidebarCollapsed: false,
  contextPanel: false,
  focusMode: false,
  audio: { master: false, click: false, notify: false, mascot: false, music: false, sfxVolume: 0.5, musicVolume: 0.3 },
};

const KEY = 'duckgp-prefs-v2';
const clamp = (n: unknown, lo: number, hi: number, fallback: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/** Validate untrusted stored JSON and merge it over defaults. */
export function sanitizePrefs(raw: unknown): Prefs {
  const d = DEFAULT_PREFS;
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const a = (r.audio && typeof r.audio === 'object' ? r.audio : {}) as Record<string, unknown>;
  return {
    theme: oneOf(r.theme, ['system', 'dark', 'light'] as const, d.theme),
    intensity: oneOf(r.intensity, ['full', 'calm', 'off'] as const, d.intensity),
    reducedMotion: bool(r.reducedMotion, d.reducedMotion),
    density: oneOf(r.density, ['comfortable', 'compact'] as const, d.density),
    chatWidth: oneOf(r.chatWidth, ['narrow', 'medium', 'wide'] as const, d.chatWidth),
    sidebarWidth: clamp(r.sidebarWidth, SIDEBAR_MIN, SIDEBAR_MAX, d.sidebarWidth),
    sidebarCollapsed: bool(r.sidebarCollapsed, d.sidebarCollapsed),
    contextPanel: bool(r.contextPanel, d.contextPanel),
    focusMode: bool(r.focusMode, d.focusMode),
    audio: {
      master: bool(a.master, false),
      click: bool(a.click, false),
      notify: bool(a.notify, false),
      mascot: bool(a.mascot, false),
      music: bool(a.music, false),
      sfxVolume: clamp(a.sfxVolume, 0, 1, d.audio.sfxVolume),
      musicVolume: clamp(a.musicVolume, 0, 1, d.audio.musicVolume),
    },
  };
}

function load(): Prefs {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    return sanitizePrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizePrefs(null);
  }
}

let current: Prefs = load();
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* storage unavailable */ }
}

export function getPrefs(): Prefs { return current; }

export function setPrefs(patch: Partial<Omit<Prefs, 'audio'>>) {
  current = sanitizePrefs({ ...current, ...patch, audio: current.audio });
  persist();
  emit();
}

export function setAudioPrefs(patch: Partial<AudioPrefs>) {
  current = sanitizePrefs({ ...current, audio: { ...current.audio, ...patch } });
  persist();
  emit();
}

export function resetPrefs() {
  current = sanitizePrefs(null);
  persist();
  emit();
}

export function subscribePrefs(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// Keep tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === KEY) { current = load(); emit(); }
  });
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribePrefs, getPrefs, getPrefs);
}

/** Subscribe to a primitive slice so unrelated pref changes do not re-render the caller. */
export function usePref<T extends string | number | boolean>(select: (p: Prefs) => T): T {
  return useSyncExternalStore(subscribePrefs, () => select(current), () => select(current));
}
