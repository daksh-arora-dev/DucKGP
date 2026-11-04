import { lazy, StrictMode, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './auth/AuthProvider';
import AuthGate from './auth/AuthGate';
const SharedView = lazy(() => import('./components/SharedView'));
import { tokenFromHash } from './lib/sharing';
import { initTheme } from './core/theme';
import { initAudio } from './core/audio';
import { initPointerTracking } from './core/duck';
import { Toasts } from './components/ui';
import './styles.css';

initTheme();
initAudio();
initPointerTracking();

function Root() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => { const on = () => setHash(window.location.hash); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  const token = tokenFromHash(hash);
  // The shared, read-only snapshot never needs (or touches) the signed-in session.
  if (token) return <MotionConfig reducedMotion="user"><Suspense fallback={null}><SharedView token={token} /></Suspense><Toasts /></MotionConfig>;
  return <AuthProvider><AuthGate /></AuthProvider>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>);
