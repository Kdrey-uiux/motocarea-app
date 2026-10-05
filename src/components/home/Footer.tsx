import { Wrench, Phone, Mail, MapPin, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        
        {/* Brand */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/20">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Moto<span className="text-orange-500">Care</span>
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed text-xs">
            Professional motorcycle workshop service, certified preventive maintenance, and real-time live telemetry tracking.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-2.5">
          <h4 className="text-white font-bold text-xs uppercase tracking-wider">Navigation</h4>
          <ul className="space-y-1.5 text-xs">
            <li><a href="#services" className="hover:text-orange-400 transition">Services</a></li>
            <li><a href="#how-it-works" className="hover:text-orange-400 transition">How It Works</a></li>
            <li><a href="#why-us" className="hover:text-orange-400 transition">Why Choose Us</a></li>
            <li><a href="#team" className="hover:text-orange-400 transition">Development Team</a></li>
            <li className="pt-1">
              <Link to="/admin" className="text-orange-400 hover:text-orange-300 transition flex items-center gap-1.5 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Staff & Admin Portal</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Information */}
        <div className="space-y-2.5">
          <h4 className="text-white font-bold text-xs uppercase tracking-wider">Workshop</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span>Santa Maria, Bulacan, Philippines</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-orange-400 shrink-0" />
              <span>+63 985 245 5897</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-400 shrink-0" />
              <span>support@motocare.ph</span>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="space-y-2.5">
          <h4 className="text-white font-bold text-xs uppercase tracking-wider">Business Hours</h4>
          <p className="leading-relaxed text-xs">
            Monday – Saturday: <strong className="text-white">8:00 AM – 6:00 PM</strong><br />
            Sunday: Closed
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-500 text-[11px]">
        <div>© 2026 MotoCare System. All rights reserved.</div>
        <div>Engineered by Kurt Andrei Alerta & Team</div>
      </div>
    </footer>
  );
}