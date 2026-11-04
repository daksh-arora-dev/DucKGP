import { useSyncExternalStore } from 'react';

export type ToastKind = 'info' | 'success' | 'error';
export interface Toast { id: number; kind: ToastKind; title: string; detail?: string }

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(kind: ToastKind, title: string, detail?: string, ms = 4200) {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, kind, title, detail }];
  emit();
  window.setTimeout(() => dismissToast(id), ms);
  return id;
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => toasts,
    () => toasts,
  );
}
