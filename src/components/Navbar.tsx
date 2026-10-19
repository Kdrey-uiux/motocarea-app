import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useLenis } from 'lenis/react';
import { Wrench, Menu, X, ArrowRight } from 'lucide-react';

const NAV_LINKS = [
  { id: 'services', label: 'Services' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'why-us', label: 'Why Us' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'team', label: 'Team' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Smooth scroller from the landing page (null on pages without it)
  const lenis = useLenis();

  // Add a soft background once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock page scroll while the mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) lenis?.stop();
    else lenis?.start();
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, lenis]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 150);
    } else if (lenis) {
      lenis.start();
      lenis.scrollTo(`#${id}`, { offset: -80 });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled || mobileMenuOpen ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/70' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand + links */}
        <div className="flex items-center gap-8 min-w-0">
          <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
              Moto<span className="text-orange-500">Care</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-7 text-[15px] font-medium text-slate-700">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="hover:text-orange-600 transition cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition active:scale-95"
          >
            <span>Log In</span>
            <ArrowRight className="w-4 h-4 hidden sm:block" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            className="lg:hidden fixed inset-x-0 top-16 sm:top-20 bottom-0 bg-white px-5 pt-4 pb-8 overflow-y-auto"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <nav className="flex flex-col">
              {NAV_LINKS.map((link, i) => (
                <motion.button
                  key={link.id}
                  type="button"
                  onClick={() => scrollToSection(link.id)}
                  className="font-display text-3xl font-bold tracking-tight text-slate-900 text-left py-3 border-b border-slate-100 cursor-pointer"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.25 }}
                >
                  {link.label}
                </motion.button>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => scrollToSection('tracking-hero')}
                className="w-full py-3 rounded-full border border-slate-200 text-sm font-semibold text-slate-800 cursor-pointer"
              >
                Track My Repair
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
