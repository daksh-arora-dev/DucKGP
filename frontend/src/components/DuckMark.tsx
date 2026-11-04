import { motion, type MotionValue } from 'motion/react';

interface DuckMarkProps {
  size?: number;
  animated?: boolean;
  className?: string;
  /** Optional eye offsets (SVG units) so the pupil can follow the pointer. */
  eyeX?: MotionValue<number>;
  eyeY?: MotionValue<number>;
  /** Tilts the brow for the thinking pose. */
  brow?: number;
}

/** The original mascot artwork, unchanged, with optional pupil tracking. */
export default function DuckMark({ size = 46, animated = false, className = '', eyeX, eyeY, brow = 0 }: DuckMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" className={`${animated ? 'duck-float' : ''} ${className}`} fill="none" role="img" aria-label="DucKGP duck mascot">
      <ellipse cx="71" cy="120" rx="45" ry="7" fill="#f9dd6d" opacity=".10" />
      <path d="M35 48 28 33l16 6 6-18 9 18" fill="#FFDF71" stroke="#17212d" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M91 39c20 10 31 32 26 54-6 27-28 38-55 34-31-5-46-23-44-49 1-26 15-43 36-48 15-4 28-1 37 9Z" fill="#FFE779" stroke="#17212d" strokeWidth="5" strokeLinejoin="round" />
      <path d="M23 86c0-14 9-23 24-23 15 0 22 10 21 24-1 15-12 25-25 23-12-2-20-11-20-24Z" fill="#F7CD58" opacity=".76" />
      <path d="M96 77c18-6 31-3 36 5-8 11-22 16-40 13" fill="#FEA06B" stroke="#17212d" strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M102 87h21" stroke="#DE7658" strokeWidth="3" strokeLinecap="round" />
      <motion.g style={{ x: eyeX ?? 0, y: eyeY ?? 0 }}>
        <circle cx="86" cy="63" r="6.8" fill="#17212d" />
        <circle cx="88.3" cy="60.5" r="2" fill="white" />
      </motion.g>
      <path d="M70 51c7-7 18-7 25-4" stroke="#17212d" strokeWidth="3.5" strokeLinecap="round" style={{ transformOrigin: '82px 49px', transform: `rotate(${brow}deg)` }} />
      <ellipse cx="57" cy="78" rx="7.7" ry="4.5" fill="#F6A971" opacity=".8" />
      <path d="M43 114 37 128m16-12-1 13M82 119l-3 11m15-12 7 10" stroke="#F4A866" strokeWidth="6" strokeLinecap="round" />
      <path d="M104 26 112 18m2 16 11-2" stroke="#94e8da" strokeWidth="3.5" strokeLinecap="round" />
      <path d="m18 40-5-6" stroke="#F6BB7C" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
