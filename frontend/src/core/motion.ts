import { useReducedMotion, type Transition, type Variants } from 'motion/react';
import { usePref } from './prefs';

/** One shared vocabulary of springs so every component moves with the same physics. */
export const spring: Transition = { type: 'spring', stiffness: 460, damping: 36, mass: 0.8 };
export const springSoft: Transition = { type: 'spring', stiffness: 220, damping: 26, mass: 0.9 };
export const springBouncy: Transition = { type: 'spring', stiffness: 520, damping: 18, mass: 0.7 };
export const ease = { out: [0.22, 1, 0.36, 1] as const, inOut: [0.65, 0, 0.35, 1] as const };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: springSoft },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: springBouncy },
  exit: { opacity: 0, scale: 0.96, y: 4, transition: { duration: 0.12 } },
};

export const stagger = (delay = 0.04): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: 0.02 } },
});

/**
 * 0 = no ambient motion (reduced / off), 0.5 = calm, 1 = full.
 * Used to scale parallax, idle loops and decorative movement.
 */
export function useMotionScale(): number {
  const system = useReducedMotion();
  const intensity = usePref((p) => p.intensity);
  const forced = usePref((p) => p.reducedMotion);
  if (system || forced || intensity === 'off') return 0;
  return intensity === 'calm' ? 0.5 : 1;
}
