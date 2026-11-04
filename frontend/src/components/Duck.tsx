import { useEffect } from 'react';
import { AnimatePresence, motion, useAnimationControls, useSpring, useTransform } from 'motion/react';
import DuckMark from './DuckMark';
import { duck, pointerX, pointerY, useDuck, type Mood } from '../core/duck';
import { useMotionScale } from '../core/motion';

interface Props { size?: number; interactive?: boolean; className?: string; label?: string }

const POSES: Record<Mood, object> = {
  idle: { y: [0, -7, 0], rotate: [-1.5, 1.5, -1.5], scaleX: 1, scaleY: 1, x: 0, transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' } },
  thinking: { y: [0, -3, 0], rotate: [-7, 3, -7], scaleX: 1, scaleY: 1, x: 0, transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  success: { y: [0, -34, 0, -10, 0], rotate: [0, -10, 10, 0, 0], scaleX: [1, 0.94, 1.05, 1.02, 1], scaleY: [1, 1.08, 0.92, 1, 1], x: 0, transition: { duration: 0.9, ease: 'easeOut' } },
  error: { x: [0, -9, 9, -7, 7, -3, 0], rotate: [0, -6, 6, -4, 4, 0, 0], y: 0, scaleX: 1, scaleY: 1, transition: { duration: 0.6 } },
  quack: { scaleX: [1, 1.14, 0.94, 1], scaleY: [1, 0.86, 1.08, 1], y: [0, 4, -14, 0], rotate: 0, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

/** Interactive mascot: pointer-tracking 3D tilt, eye follow, mood poses driven by real app events. */
export default function Duck({ size = 120, interactive = true, className = '', label = 'Give DucKGP a quack' }: Props) {
  const scale = useMotionScale();
  const { mood, nonce } = useDuck();
  const controls = useAnimationControls();
  const rx = useSpring(useTransform(pointerY, [-1, 1], [14, -14]), { stiffness: 120, damping: 16 });
  const ry = useSpring(useTransform(pointerX, [-1, 1], [-18, 18]), { stiffness: 120, damping: 16 });
  const ex = useSpring(useTransform(pointerX, [-1, 1], [-3.2, 3.2]), { stiffness: 220, damping: 20 });
  const ey = useSpring(useTransform(pointerY, [-1, 1], [-2.4, 2.4]), { stiffness: 220, damping: 20 });
  const tiltX = useTransform(rx, (v) => v * scale);
  const tiltY = useTransform(ry, (v) => v * scale);

  useEffect(() => {
    if (scale === 0 && (mood === 'idle' || mood === 'thinking')) { controls.stop(); return; }
    void controls.start(POSES[mood] as never);
  }, [mood, nonce, scale, controls]);

  const body = (
    <motion.div style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: 'preserve-3d', width: size, height: size }}>
      <motion.div animate={controls} style={{ width: size, height: size, translateZ: 30 }}>
        <DuckMark size={size} eyeX={ex} eyeY={ey} brow={mood === 'thinking' ? -8 : mood === 'error' ? 10 : 0} />
      </motion.div>
      <AnimatePresence>
        {mood === 'thinking' && (
          <motion.span key="dots" className="duck-thought" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} aria-hidden="true"><i /><i /><i /></motion.span>
        )}
        {mood === 'quack' && size >= 60 && (
          <motion.span key="quack" className="duck-pop" initial={{ opacity: 0, y: 8, scale: 0.6 }} animate={{ opacity: 1, y: -10, scale: 1 }} exit={{ opacity: 0 }} aria-hidden="true">QUACK!</motion.span>
        )}
        {mood === 'success' && [0, 1, 2].map((i) => (
          <motion.span key={`s${i}`} className="duck-spark" initial={{ opacity: 1, x: 0, y: 0, scale: 0.4 }} animate={{ opacity: 0, x: (i - 1) * 46, y: -48 - i * 6, scale: 1.1 }} transition={{ duration: 0.9, delay: i * 0.06 }} aria-hidden="true">✦</motion.span>
        ))}
        {mood === 'error' && size >= 60 && (
          <motion.span key="sweat" className="duck-sweat" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 6 }} exit={{ opacity: 0 }} aria-hidden="true">💧</motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );

  if (!interactive) return <div className={`duck-stage ${className}`} style={{ width: size, height: size }}>{body}</div>;
  return (
    <motion.button type="button" data-sfx="none" className={`duck-stage duck-button ${className}`} style={{ width: size, height: size }}
      whileTap={{ scale: 0.94 }} onClick={() => duck.quack()} title={label} aria-label={label}>
      {body}
    </motion.button>
  );
}
