import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useLenis } from 'lenis/react';
import {
  Wrench,
  Menu,
  X,
  ArrowRight,
  ChevronRight,
  ListChecks,
  ShieldCheck,
  Star,
  Users,
  MapPin,
  Navigation,
} from 'lucide-react';
import { SHOP_INFO, SHOP_DIRECTIONS_URL } from '../utils/shopInfo';
import MotoCareLogo from './brand/MotoCareLogo';

// Landing page sections (icons show in the mobile menu)
const NAV_LINKS = [
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'how-it-works', label: 'How It Works', icon: ListChecks },
  { id: 'why-us', label: 'Why Us', icon: ShieldCheck },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'team', label: 'Team', icon: Users },
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
            <MotoCareLogo className="h-11 sm:h-14 w-auto text-slate-900" />
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

      {/* Mobile / tablet menu: rendered at the end of <body>, because the header's backdrop blur
          would otherwise make it the menu's frame and squash the full-screen panel to the header height */}
      {createPortal(
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            className="lg:hidden fixed inset-x-0 top-16 sm:top-20 bottom-0 z-40 bg-[#f7f8fa] overflow-y-auto overflow-x-hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {/* Soft orange fade, same as the staff console background */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.14)_0%,rgba(249,115,22,0)_65%)]"
            />

            <div className="relative flex flex-col gap-4 px-4 pt-4 pb-8 max-w-md mx-auto">
              {/* Page sections */}
              <nav className="bg-white rounded-3xl border border-slate-200/70 p-1.5">
                {NAV_LINKS.map((link, i) => {
                  const Icon = link.icon;
                  return (
                    <motion.button
                      key={link.id}
                      type="button"
                      onClick={() => scrollToSection(link.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left hover:bg-orange-50 active:bg-orange-50 transition cursor-pointer group"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * i, duration: 0.2 }}
                    >
                      <Icon className="w-5 h-5 text-orange-500 shrink-0" />
                      <span className="flex-1 font-semibold text-slate-900">{link.label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition shrink-0" />
                    </motion.button>
                  );
                })}
              </nav>

              {/* Shop location */}
              <a
                href={SHOP_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white rounded-3xl border border-slate-200/70 px-4 py-3.5 hover:border-orange-200 transition group"
              >
                <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
                <span className="flex-1 min-w-0 text-sm text-slate-600 leading-snug">{SHOP_INFO.address}</span>
                <span className="text-sm font-semibold text-orange-600 flex items-center gap-1 shrink-0">
                  Directions
                  <Navigation className="w-3.5 h-3.5" />
                </span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </header>
  );
}
