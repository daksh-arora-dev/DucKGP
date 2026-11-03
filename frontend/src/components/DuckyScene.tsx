import { useState, type PointerEvent } from 'react';
import { Sparkles } from 'lucide-react';
import DuckMark from './DuckMark';

/** CSS-3D duck illustration: pointer-following tilt, float, shadows and a clickable reaction. */
export default function DuckyScene() {
  const [quack, setQuack] = useState(false);

  function onMove(event: PointerEvent<HTMLButtonElement>) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty('--tilt-x', `${(-y * 18).toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${(x * 22).toFixed(2)}deg`);
  }

  function reset(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.style.setProperty('--tilt-x', '0deg');
    event.currentTarget.style.setProperty('--tilt-y', '0deg');
  }

  function react() {
    setQuack(true);
    window.setTimeout(() => setQuack(false), 950);
  }

  return (
    <div className="duck-scene">
      <span className="duck-scene-orbit duck-scene-orbit-1" aria-hidden="true" />
      <span className="duck-scene-orbit duck-scene-orbit-2" aria-hidden="true" />
      <span className="duck-scene-speck duck-speck-one" aria-hidden="true">✳</span>
      <span className="duck-scene-speck duck-speck-two" aria-hidden="true">✦</span>
      <button
        type="button"
        className={`duck-3d-hitarea ${quack ? 'is-quacking' : ''}`}
        onPointerMove={onMove}
        onPointerLeave={reset}
        onClick={react}
        title="Give DucKGP a quack"
        aria-label="Make the duck quack"
      >
        <span className="duck-3d-stage">
          <span className="duck-3d-platform" />
          <span className="duck-3d-shadow" />
          <span className="duck-3d-body"><DuckMark size={245} animated /></span>
          <span className="duck-3d-pop" aria-hidden="true">QUACK!</span>
          <span className="duck-3d-spark"><Sparkles size={19} /></span>
        </span>
      </button>
      <span className="duck-scene-note">go ahead, tap the duck ↗</span>
    </div>
  );
}
