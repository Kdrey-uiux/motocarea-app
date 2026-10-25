import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import MotoCareLogo from './MotoCareLogo';
import { acquireLoader, isLoading, releaseLoader, subscribeLoading } from './loadingStore';

// The logo intro (letters, seat, drawn bike) takes about 1.6s; the overlay stays at least this long
const MIN_VISIBLE_MS = 1800;
const FADE_OUT_MS = 280;

/**
 * Marks the current screen as loading. It draws nothing itself: the single LoadingOverlayHost
 * (mounted once in App) shows the overlay, so several loading steps in a row look like one.
 */
export default function LoadingScreen() {
  // Layout effect: registered before the browser paints, so there is no blank frame
  useLayoutEffect(() => {
    acquireLoader();
    return releaseLoader;
  }, []);
  return null;
}

/**
 * The app-wide loading overlay: white page, animated MotoCare logo, sliding bar.
 * Appears as soon as anything is loading, stays until the logo animation has finished,
 * then fades out.
 */
export function LoadingOverlayHost() {
  const loading = useSyncExternalStore(subscribeLoading, isLoading);
  const [phase, setPhase] = useState<'hidden' | 'shown' | 'leaving'>('hidden');
  const shownAt = useRef<number | null>(null);

  // Show right away when loading starts (also while it is fading out)
  if (loading && phase !== 'shown') setPhase('shown');

  // When the overlay first appears (the intro starts there)
  useEffect(() => {
    if (phase === 'shown' && shownAt.current === null) shownAt.current = Date.now();
  }, [phase]);

  useEffect(() => {
    if (loading || phase !== 'shown') return;
    // Loading is done: wait for the intro to finish, then fade out
    const wait = Math.max(0, (shownAt.current ?? Date.now()) + MIN_VISIBLE_MS - Date.now());
    const toLeave = window.setTimeout(() => setPhase('leaving'), wait);
    return () => window.clearTimeout(toLeave);
  }, [loading, phase]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const toHide = window.setTimeout(() => {
      setPhase('hidden');
      shownAt.current = null;
    }, FADE_OUT_MS);
    return () => window.clearTimeout(toHide);
  }, [phase]);

  if (phase === 'hidden') return null;

  return (
    <div
      role="status"
      aria-busy={phase === 'shown'}
      aria-label="Loading"
      className={`loading-screen fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 p-4 select-none bg-white text-[#0f172a] force-light transition-opacity ease-out ${
        phase === 'leaving' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${FADE_OUT_MS}ms` }}
    >
      <MotoCareLogo animated className="h-20 sm:h-28 w-auto" />
      <div className="relative w-28 h-1 rounded-full overflow-hidden bg-black/[0.06]">
        <span className="loading-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-[#f97316]" />
      </div>
    </div>
  );
}
