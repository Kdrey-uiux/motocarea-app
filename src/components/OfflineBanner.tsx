import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Small notice at the bottom of the screen while the device has no internet */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm shadow-2xl flex items-center gap-3 print:hidden"
    >
      <WifiOff className="w-4 h-4 text-orange-400 shrink-0" />
      <span>You're offline. Changes won't save until your connection is back.</span>
    </div>
  );
}
