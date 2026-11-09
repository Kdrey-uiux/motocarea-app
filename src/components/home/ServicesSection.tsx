import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Droplets, Disc, ShieldCheck, Activity, Sliders, Zap, Gauge, Layers } from 'lucide-react';
import { Reveal, SectionPill } from './motion';
import { staggerChild, staggerParent } from './motionVariants';
import { useSiteContent } from '../../utils/siteContent';

// One icon per card, in the same order as the cards in Website content
const SERVICE_ICONS = [Droplets, Disc, ShieldCheck, Activity, Sliders, Zap, Gauge, Layers];

export default function ServicesSection() {
  const { services } = useSiteContent();
  // Scroll-linked: the gray sheet rises and grows to full size as it enters the screen
  const sheetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sheetRef, offset: ['start end', 'start 0.2'] });
  const sheetScale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  const sheetY = useTransform(scrollYProgress, [0, 1], [90, 0]);

  return (
    <section id="services" className="scroll-mt-16 sm:scroll-mt-20 px-2 sm:px-4">
      <motion.div
        ref={sheetRef}
        style={{ scale: sheetScale, y: sheetY }}
        className="bg-slate-50 rounded-[1.75rem] sm:rounded-[2.5rem] px-4 sm:px-8 lg:px-12 py-12 sm:py-20 origin-top"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <Reveal className="max-w-2xl">
              <SectionPill>Services</SectionPill>
              <h2 className="text-balance mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] text-slate-900 leading-[1.02]">
                What we <span className="text-orange-500">fix?</span>
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                From routine maintenance to deep diagnostics, our mechanics handle every part of your motorcycle.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="lg:max-w-xs">
              <p className="text-sm font-semibold text-slate-900">Not sure what's wrong?</p>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                Book a diagnostic check. A mechanic inspects your motorcycle and gives you a quote before any repair.
              </p>
            </Reveal>
          </div>

          {/* Two small cards per row on phones, four on desktop */}
          <motion.div
            className="mt-8 sm:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4"
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          >
            {services.map((item, index) => {
              const Icon = SERVICE_ICONS[index];
              return (
              <motion.div
                key={index}
                variants={staggerChild}
                className="group bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200/70 hover:border-orange-300 sm:hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/5 transition-[transform,box-shadow,border-color] duration-300"
              >
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-500 transition-colors duration-300">
                  <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-orange-500 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="mt-3 sm:mt-5 font-display text-sm sm:text-lg font-bold tracking-tight text-slate-900 leading-snug">
                  {item.title}
                </h3>
                <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-3 sm:line-clamp-none">
                  {item.description}
                </p>
              </motion.div>
              );
            })}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
