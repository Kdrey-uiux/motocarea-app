import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, User, Menu, X } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm shadow-orange-500/20 text-white shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Moto<span className="text-orange-500">Care</span>
          </span>
        </Link>

        {/* Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button onClick={() => scrollToSection('services')} className="hover:text-orange-600 transition cursor-pointer">
            Services
          </button>
          <button onClick={() => scrollToSection('how-it-works')} className="hover:text-orange-600 transition cursor-pointer">
            How It Works
          </button>
          <button onClick={() => scrollToSection('why-us')} className="hover:text-orange-600 transition cursor-pointer">
            Why Choose Us
          </button>
          <button onClick={() => scrollToSection('team')} className="hover:text-orange-600 transition cursor-pointer">
            Team
          </button>
        </nav>

        {/* Actions (Desktop & Mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link
            to="/login"
            className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 p-2 sm:px-3 sm:py-2 rounded-full hover:bg-slate-100 transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
            title="Log In to Customer Dashboard"
          >
            <User className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Log In</span>
          </Link>

          <button
            onClick={() => scrollToSection('tracking-hero')}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition shadow-sm shadow-orange-500/20 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            Track Status
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => scrollToSection('services')}
            className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition"
          >
            Services
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('why-us')}
            className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition"
          >
            Why Choose Us
          </button>
          <button
            onClick={() => scrollToSection('team')}
            className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition"
          >
            Team
          </button>
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Sign In to Customer Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}