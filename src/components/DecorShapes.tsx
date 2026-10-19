import { motion } from 'motion/react';

/**
 * The landing page's decorative shapes (orange arch + peach/yellow quarter circles),
 * fixed in the background behind the page content (the arch clears the desktop sidebar).
 * Put it inside an `isolate` container so it sits above that container's background.
 * Purely visual: hidden from screen readers and never catches clicks.
 */
export default function DecorShapes({
  archPosition = '-left-8 md:left-32',
}: {
  /** Left position of the orange arch, so it clears the page's sidebar (static Tailwind classes) */
  archPosition?: string;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden">
      <motion.div
        className={`absolute ${archPosition} bottom-6 sm:bottom-10 w-24 h-12 sm:w-32 sm:h-16 rounded-t-full border-[16px] sm:border-[22px] border-b-0 border-orange-500/90`}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0, rotate: [0, -8, 0] }}
        transition={{
          opacity: { duration: 0.8, delay: 0.3 },
          y: { duration: 0.8, delay: 0.3 },
          rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
        }}
      />
      <motion.div
        className="absolute -right-4 sm:right-[3%] top-28 sm:top-36 flex flex-col gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0, x: [0, -8, 0] }}
        transition={{
          opacity: { duration: 0.8, delay: 0.4 },
          y: { duration: 0.8, delay: 0.4 },
          x: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-tl-full bg-orange-200" />
        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-bl-full bg-amber-200" />
      </motion.div>
    </div>
  );
}
