/**
 * Mascot state + pointer tracking. The mascot reacts to REAL application events only:
 * the chat hook sets `thinking` while a request is in flight and emits success/error when it settles.
 */
import { useSyncExternalStore } from 'react';
import { motionValue } from 'motion/react';
import { sfx } from './audio';

export type Mood = 'idle' | 'thinking' | 'success' | 'error' | 'quack';
interface DuckState { mood: Mood; nonce: number }

let base: 'idle' | 'thinking' = 'idle';
let transient: Exclude<Mood, 'idle' | 'thinking'> | null = null;
let nonce = 0;
let timer: number | null = null;
let state: DuckState = { mood: 'idle', nonce: 0 };
const listeners = new Set<() => void>();

function recompute() {
  nonce += 1;
  state = { mood: transient ?? base, nonce };
  listeners.forEach((l) => l());
}

function flash(kind: Exclude<Mood, 'idle' | 'thinking'>, ms: number) {
  transient = kind;
  if (timer !== null) clearTimeout(timer);
  timer = window.setTimeout(() => { transient = null; timer = null; recompute(); }, ms);
  recompute();
}

export const duck = {
  thinking(on: boolean) { base = on ? 'thinking' : 'idle'; recompute(); },
  success() { flash('success', 1500); sfx('success'); },
  error() { flash('error', 1400); sfx('error'); },
  quack() { flash('quack', 900); sfx('quack'); },
  get state() { return state; },
};

export function useDuck(): DuckState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => state);
}

/** Normalised pointer position (-1..1) shared by the mascot and background parallax. */
export const pointerX = motionValue(0);
export const pointerY = motionValue(0);

let tracking = false;
export function initPointerTracking() {
  if (tracking || typeof window === 'undefined') return;
  tracking = true;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    pointerX.set((e.clientX / window.innerWidth) * 2 - 1);
    pointerY.set((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });
  window.addEventListener('blur', () => { pointerX.set(0); pointerY.set(0); });
}
