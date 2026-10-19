import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { EASE } from './motionVariants';

/**
 * Shared landing-page animation helpers.
 * Motion respects the visitor's "reduce motion" setting through <MotionConfig reducedMotion="user"> in Home.
 */

/** Fades and slides content up the first time it scrolls into view */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Small rounded label shown above each section heading */
export function SectionPill({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <span
      className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium ${
        tone === 'dark' ? 'bg-white text-slate-900' : 'bg-orange-100/70 text-orange-700'
      }`}
    >
      {children}
    </span>
  );
}
