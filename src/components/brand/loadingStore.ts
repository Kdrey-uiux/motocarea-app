/**
 * Shared loading state for the one app-wide loading overlay (LoadingOverlayHost).
 * Screens that are loading render <LoadingScreen />, which only registers here; the host shows
 * a single overlay for all of them, so the logo animation plays once and is never cut short.
 */
type Listener = () => void;

let openCount = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function acquireLoader() {
  openCount += 1;
  emit();
}

export function releaseLoader() {
  openCount = Math.max(0, openCount - 1);
  emit();
}

export function isLoading(): boolean {
  return openCount > 0;
}

export function subscribeLoading(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
