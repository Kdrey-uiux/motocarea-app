import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Mail, MapPin, Navigation } from 'lucide-react';
import { SHOP_INFO, SHOP_DIRECTIONS_URL, SHOP_MAPS_URL } from '../../utils/shopInfo';
import LegalTermsModal from '../legal/LegalTermsModal';
import MotoCareLogo from '../brand/MotoCareLogo';

const LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#why-us', label: 'Why Us' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#team', label: 'Team' },
];

export default function Footer() {
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | null>(null);

  return (
    <footer className="bg-slate-950 text-slate-400 px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-10 text-sm">
        {/* Brand */}
        <div className="space-y-4">
          <MotoCareLogo className="h-16 w-auto text-white" />
          <p className="leading-relaxed">
            Motorcycle workshop service, preventive maintenance, and live repair tracking.
          </p>
        </div>

        {/* Navigation */}
        <div className="space-y-4">
          <h4 className="text-white font-semibold">Explore</h4>
          <ul className="space-y-2.5">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="hover:text-orange-400 transition">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h4 className="text-white font-semibold">Workshop</h4>
          <div className="space-y-3">
            {/* Opens the shop in Google Maps */}
            <a
              href={SHOP_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2.5 hover:text-orange-400 transition"
              title="Open in Google Maps"
            >
              <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span className="underline decoration-white/20 underline-offset-4">{SHOP_INFO.address}</span>
            </a>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-orange-400 shrink-0" />
              <span>+63 985 245 5897</span>
            </div>
            <div className="flex items-center gap-2.5 min-w-0">
              <Mail className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="break-all">support@motocare.ph</span>
            </div>
          </div>
          <a
            href={SHOP_DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition active:scale-95"
          >
            <Navigation className="w-4 h-4" />
            Get directions
          </a>
        </div>

        {/* Hours */}
        <div className="space-y-4">
          <h4 className="text-white font-semibold">Business Hours</h4>
          <p className="leading-relaxed">
            Monday – Saturday
            <br />
            <strong className="text-white font-semibold">8:00 AM – 6:00 PM</strong>
            <br />
            Sunday: Closed
          </p>
        </div>
      </div>

      {/* Above the big wordmark below, which reaches up behind this row */}
      <div className="relative z-10 max-w-7xl mx-auto mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
        <div>© 2026 MotoCare. All rights reserved.</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLegalTab('terms')}
            className="px-2 py-1.5 rounded-md hover:text-orange-400 transition cursor-pointer"
          >
            Terms
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setLegalTab('privacy')}
            className="px-2 py-1.5 rounded-md hover:text-orange-400 transition cursor-pointer"
          >
            Privacy Policy
          </button>
        </div>
      </div>

      {/* Portal: the landing page's scroll effects would otherwise trap the fixed overlay */}
      {legalTab &&
        createPortal(
          <LegalTermsModal key={legalTab} isOpen initialTab={legalTab} onClose={() => setLegalTab(null)} />,
          document.body
        )}

      {/* Big wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none font-display font-extrabold tracking-[-0.05em] leading-[0.8] text-center text-[15.5vw] lg:text-[15rem] text-white/[0.06] select-none mt-6 -mb-[0.12em]"
      >
        MOTOCARE
      </div>
    </footer>
  );
}
