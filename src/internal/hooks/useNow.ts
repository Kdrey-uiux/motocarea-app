import { useEffect, useState } from 'react';

/**
 * Current time in ms that refreshes on an interval, so "elapsed time" badges keep
 * counting even when no ticket data changes.
 */
export function useNow(intervalMs = 60000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
