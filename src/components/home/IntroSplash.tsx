import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import MotoCareLogo from '../brand/MotoCareLogo';

const SEEN_KEY = 'motocare_intro_seen';

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Short brand intro (the animated logo, under 2 seconds) shown once per browser session on the landing page */
export default function IntroSplash() {
  const [visible, setVisible] = useState(() => !alreadySeen());

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Storage blocked: the intro may show again next time, which is fine
    }
    const timer = window.setTimeout(() => setVisible(false), 1800);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] bg-white flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeOut' } }}
          aria-hidden="true"
        >
          {/* Same animated logo as the loading screen */}
          <MotoCareLogo animated className="h-24 sm:h-36 w-auto text-slate-900" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
