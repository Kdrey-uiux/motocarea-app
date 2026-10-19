import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';

const LINES = ['Book online.', 'Track every stage.', 'Ride out with confidence.'];

/** One line of the statement: dim until the scroll reaches its part of the section */
function ScrubLine({ text, progress, index }: { text: string; progress: MotionValue<number>; index: number }) {
  const start = index * 0.22;
  const end = start + 0.32;
  const opacity = useTransform(progress, [start, end], [0.18, 1]);
  const y = useTransform(progress, [start, end], [36, 0]);
  return (
    <motion.span style={{ opacity, y }} className="block pb-1">
      {text}
    </motion.span>
  );
}

/** Full-width orange band whose lines light up one after another as you scroll */
export default function StatementBand() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start 0.85', 'end 0.55'] });
  const factsOpacity = useTransform(scrollYProgress, [0.75, 1], [0, 1]);

  return (
    <section ref={sectionRef} className="bg-orange-500 px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36 overflow-hidden">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-[2.4rem] leading-[1.02] sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.04em] text-white">
          {LINES.map((line, i) => (
            <ScrubLine key={line} text={line} progress={scrollYProgress} index={i} />
          ))}
        </h2>
        <motion.p style={{ opacity: factsOpacity }} className="mt-6 sm:mt-8 text-sm sm:text-lg text-orange-50/90">
          Open Monday to Saturday · 6 bookings a day · Pay cash at the counter
        </motion.p>
      </div>
    </section>
  );
}
