import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { CalendarCheck, Ticket, Wrench, KeyRound } from 'lucide-react';
import { Reveal, SectionPill } from './motion';
import { staggerChild, staggerParent } from './motionVariants';

const STEPS = [
  {
    icon: CalendarCheck,
    title: 'Book online',
    desc: 'Pick a service, your motorcycle, a date (Monday to Saturday) and an arrival window.',
  },
  {
    icon: Ticket,
    title: 'Drop off your bike',
    desc: 'Bring it in during your window. Walk-ins are welcome too and get a ticket number at the counter.',
  },
  {
    icon: Wrench,
    title: 'Track every stage',
    desc: 'Follow the repair live: Intake, Inspect, Service, Test, and Ready.',
  },
  {
    icon: KeyRound,
    title: 'Pick up & ride',
    desc: "We'll tell you when it's ready. Pay cash at the counter and ride out.",
  },
];

export default function HowItWorksSection() {
  // Scroll-linked: the lines between steps draw from left to right as you scroll
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 0.9', 'start 0.4'] });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="how-it-works" className="scroll-mt-16 sm:scroll-mt-20 px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center max-w-3xl mx-auto">
          <SectionPill>How it works</SectionPill>
          <h2 className="text-balance mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] text-slate-900 leading-[1.04]">
            From booking to pickup, <span className="text-orange-500">in four steps</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Full transparency, zero guesswork. You always know where your motorcycle is.
          </p>
        </Reveal>

        <motion.ol
          ref={listRef}
          className="mt-12 sm:mt-16 grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        >
          {STEPS.map((step, i) => (
            <motion.li key={step.title} variants={staggerChild} className="relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="font-display text-sm font-bold text-orange-500">0{i + 1}</span>
                {/* Connector to the next step (desktop) */}
                {i < STEPS.length - 1 && (
                  <span aria-hidden="true" className="hidden lg:block flex-1 h-px bg-slate-200 ml-1 overflow-hidden">
                    <motion.span style={{ scaleX: lineScale }} className="block h-full bg-orange-400 origin-left" />
                  </span>
                )}
              </div>
              <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{step.desc}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
