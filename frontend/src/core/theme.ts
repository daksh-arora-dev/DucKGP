import { getPrefs, subscribePrefs, type ThemePref } from './prefs';

export type ResolvedTheme = 'dark' | 'light';
const THEME_COLORS: Record<ResolvedTheme, string> = { dark: '#16171a', light: '#faf6ea' };

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  return pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
}

export function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Writes theme / density / motion attributes onto <html>. Cheap and idempotent. */
export function applyPrefsToDocument() {
  const p = getPrefs();
  const root = document.documentElement;
  const theme = resolveTheme(p.theme);
  root.dataset.theme = theme;
  root.dataset.themePref = p.theme;
  root.style.colorScheme = theme;
  root.dataset.density = p.density;
  const motionOff = p.intensity === 'off' || p.reducedMotion || systemPrefersReducedMotion();
  root.dataset.motion = motionOff ? 'off' : p.intensity;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

let started = false;
/** Call once before first render (also done by the inline script in index.html to avoid a flash). */
export function initTheme() {
  if (started || typeof window === 'undefined') return;
  started = true;
  let lastTheme = getPrefs().theme;
  applyPrefsToDocument();
  subscribePrefs(() => {
    const next = getPrefs().theme;
    if (next !== lastTheme) {
      lastTheme = next;
      const root = document.documentElement;
      root.classList.add('theme-fade');
      window.setTimeout(() => root.classList.remove('theme-fade'), 420);
    }
    applyPrefsToDocument();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPrefsToDocument);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', applyPrefsToDocument);
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/** Circular reveal from the click point where supported; plain cross-fade otherwise. */
export function changeThemeAnimated(apply: () => void, origin?: { x: number; y: number }) {
  const doc = document as ViewTransitionDoc;
  const motionOff = document.documentElement.dataset.motion === 'off';
  if (!doc.startViewTransition || motionOff || !origin) { apply(); return; }
  const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
  const transition = doc.startViewTransition(apply);
  void transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
      { duration: 520, easing: 'cubic-bezier(.22,.9,.3,1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => { /* transition skipped */ });
}
