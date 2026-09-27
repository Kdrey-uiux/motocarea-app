import { Wrench, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0b0f19] text-slate-400 py-12 px-4 sm:px-6 lg:px-8 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">
              Moto<span className="text-orange-500">Care</span>
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Professional motorcycle service and automated tracking portal.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-2">
          <h4 className="text-white font-bold text-xs uppercase tracking-wider">Navigation</h4>
          <ul className="space-y-1.5">
            <li><a href="#services" className="hover:text-white transition">Services</a></li>
            <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
            <li><a href="#why-us" className="hover:text-white transition">Why Choose Us</a></li>
            <li><a href="#team" className="hover:text-white transition">Development Team</a></li>
          </ul>
        </div>

        {/* Contact Information */}
        <div className="space-y-2">
          <h4 className="text-white font-bold text-xs uppercase tracking-wider">Workshop</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <span>Santa Maria, Bulacan, Philippines</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <span>+63 985 245 5897</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <span>support@motocare.ph</span>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="space-y-2">
          <h4 className="text-white font-bold text-xs uppercase tracking-wider">Business Hours</h4>
          <p className="leading-relaxed">
            Monday – Saturday: <strong className="text-white">8:00 AM – 6:00 PM</strong><br />
            Sunday: Closed
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-500">
        <div>© 2026 MotoCare System. All rights reserved.</div>
        <div>Engineered by Kurt Andrei Alerta & Team</div>
      </div>
    </footer>
  );
}