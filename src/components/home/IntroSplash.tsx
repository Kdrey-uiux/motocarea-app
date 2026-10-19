import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Wrench } from 'lucide-react';

const SEEN_KEY = 'motocare_intro_seen';

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Short brand intro (about 1 second) shown once per browser session on the landing page */
export default function IntroSplash() {
  const [visible, setVisible] = useState(() => !alreadySeen());

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Storage blocked: the intro may show again next time, which is fine
    }
    const timer = window.setTimeout(() => setVisible(false), 1200);
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
          <motion.div
            className="flex items-center gap-3"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: [0.92, 1.04, 1], opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <Wrench className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              Moto<span className="text-orange-500">Care</span>
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
