import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { Search, ArrowRight, Bike, Sparkle } from 'lucide-react';
import { EASE } from './motionVariants';

export default function Hero() {
  // The part after "MC-": 4821 for online bookings, W-4821 for walk-in tickets.
  // The tracking page works out which kind it is and asks walk-ins to verify.
  const [ticketDigits, setTicketDigits] = useState('');
  const navigate = useNavigate();

  // Scroll-linked: as the page scrolls, the hero shrinks, lifts, blurs and fades while the next
  // section rises over it. The hero is sticky, so this follows the page scroll, not the hero's position.
  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 650], [0, -80]);
  const contentScale = useTransform(scrollY, [0, 650], [1, 0.92]);
  const contentOpacity = useTransform(scrollY, [0, 550], [1, 0]);
  const contentBlur = useTransform(scrollY, [0, 550], ['blur(0px)', 'blur(12px)']);
  const shapeLeftY = useTransform(scrollY, [0, 650], [0, -220]);
  const shapeRightY = useTransform(scrollY, [0, 650], [0, -130]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = ticketDigits.replace(/^-+|-+$/g, '');
    if (code) {
      navigate(`/track/MC-${code}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Letters, digits and dashes; a pasted "MC-1234" or "MC-W-1234" drops the "MC-"
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (val.startsWith('MC-')) val = val.slice(3);
    setTicketDigits(val.slice(0, 10));
  };

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  });

  return (
    <section
      id="tracking-hero"
      className="relative scroll-mt-16 sm:scroll-mt-20 px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 overflow-hidden"
    >
      {/* Floating shapes (tablet and up) */}
      <motion.div
        aria-hidden="true"
        style={{ y: shapeLeftY }}
        className="hidden md:block absolute left-[8%] bottom-10 w-28 h-14 lg:w-32 lg:h-16 rounded-t-full border-[18px] lg:border-[22px] border-b-0 border-orange-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, rotate: [0, -8, 0] }}
        transition={{ opacity: { duration: 0.8, delay: 0.6 }, rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
      />
      <motion.div
        aria-hidden="true"
        style={{ y: shapeRightY }}
        className="hidden md:flex absolute right-[7%] bottom-14 flex-col gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, x: [0, -8, 0] }}
        transition={{ opacity: { duration: 0.8, delay: 0.75 }, x: { duration: 7, repeat: Infinity, ease: 'easeInOut' } }}
      >
        <div className="w-14 h-14 rounded-tl-full bg-orange-200" />
        <div className="w-14 h-14 rounded-bl-full bg-amber-200" />
      </motion.div>

      <motion.div
        style={{ y: contentY, scale: contentScale, opacity: contentOpacity, filter: contentBlur }}
        className="relative max-w-5xl mx-auto text-center origin-top"
      >
        <motion.p
          {...rise(0.05)}
          className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
        >
          <span className="hidden sm:inline">Motorcycle workshop · </span>Santa Maria, Bulacan
        </motion.p>

        <motion.h1
          {...rise(0.15)}
          className="relative mt-4 sm:mt-5 text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-extrabold tracking-[-0.035em] text-slate-900"
        >
          <Sparkle className="hidden sm:block absolute -top-4 left-[12%] w-6 h-6 text-orange-400 fill-orange-400" aria-hidden="true" />
          Your Motorcycle Deserves{' '}
          <span className="whitespace-nowrap">
            Expert
            {/* Animated "ride" pill: a bike rolling across, like a switch turning on */}
            <span
              aria-hidden="true"
              className="relative inline-flex align-middle mx-2 sm:mx-3 w-[3.4rem] h-[1.9rem] sm:w-24 sm:h-12 lg:w-28 lg:h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 -translate-y-[0.06em] overflow-hidden"
            >
              <motion.span
                className="absolute top-1 bottom-1 sm:top-1.5 sm:bottom-1.5 aspect-square rounded-full bg-white flex items-center justify-center shadow-md"
                initial={{ left: '4%' }}
                animate={{ left: ['4%', '48%', '4%'] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              >
                <Bike className="w-3.5 h-3.5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-500" />
              </motion.span>
            </span>
          </span>
          <span className="sr-only"> </span>
          <span className="text-orange-500">Care</span>
        </motion.h1>

        <motion.p
          {...rise(0.3)}
          className="mt-5 sm:mt-7 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto"
        >
          Book a service online, follow every repair stage live, and ride out knowing exactly what was done.
        </motion.p>

        {/* Main actions */}
        <motion.div
          {...rise(0.42)}
          className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-1 sm:p-1.5 sm:rounded-full sm:border sm:border-slate-200 sm:bg-white sm:w-fit sm:mx-auto"
        >
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-[15px] font-semibold transition active:scale-95"
          >
            Book a Service
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center px-6 py-3.5 sm:py-3 rounded-full border border-slate-200 sm:border-0 text-[15px] font-semibold text-slate-800 hover:text-orange-600 transition"
          >
            How It Works
          </a>
        </motion.div>

        {/* Ticket tracking */}
        <motion.div {...rise(0.55)} className="mt-10 sm:mt-14 max-w-xl mx-auto text-left">
          <label htmlFor="hero-ticket" className="block text-sm font-semibold text-slate-800 mb-2 text-center">
            Already have a ticket number?
          </label>
          <form
            onSubmit={handleTrackSubmit}
            className="bg-white border border-slate-200 p-1.5 rounded-2xl sm:rounded-full flex flex-col sm:flex-row gap-1.5 shadow-sm focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition"
          >
            <div className="flex-1 flex items-center gap-2 px-3 py-2 sm:py-0 min-w-0">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-700 font-bold font-mono text-sm select-none shrink-0">
                MC-
              </span>
              <input
                id="hero-ticket"
                type="text"
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={12}
                value={ticketDigits}
                onChange={handleInputChange}
                placeholder="4821 or W-4821"
                className="w-full min-w-0 bg-transparent text-slate-900 placeholder:not-italic placeholder:text-slate-400 text-base sm:text-sm focus:outline-none font-mono font-bold tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={!ticketDigits.replace(/-/g, '')}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-3 sm:py-2.5 rounded-xl sm:rounded-full transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              Track Status
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500 text-center">
            On your dashboard if you booked online, or on the slip from our counter if you walked in.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
