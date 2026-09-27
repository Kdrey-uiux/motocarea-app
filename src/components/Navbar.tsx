import { Link, useNavigate } from 'react-router-dom';
import { Wrench, User } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Moto<span className="text-blue-600">Care</span>
          </span>
        </Link>

        {/* Links - Malinis, walang Testimonials */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button onClick={() => scrollToSection('services')} className="hover:text-blue-600 transition">
            Services
          </button>
          <button onClick={() => scrollToSection('how-it-works')} className="hover:text-blue-600 transition">
            How It Works
          </button>
          <button onClick={() => scrollToSection('why-us')} className="hover:text-blue-600 transition">
            Why Choose Us
          </button>
          <button onClick={() => scrollToSection('team')} className="hover:text-blue-600 transition">
            Team
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg transition flex items-center gap-1.5"
          >
            <User className="w-4 h-4 text-slate-500" />
            <span>Log In</span>
          </Link>
          <button
            onClick={() => scrollToSection('tracking-hero')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm active:scale-95"
          >
            Track Status
          </button>
        </div>
      </div>
    </header>
  );
}