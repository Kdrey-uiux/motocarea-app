import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ShieldCheck, Star, Award, Sparkles } from 'lucide-react';

export default function Hero() {
  const [trackingCode, setTrackingCode] = useState('');
  const navigate = useNavigate();

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      navigate(`/track/${trackingCode.trim().toUpperCase()}`);
    }
  };

  return (
    <section id="tracking-hero" className="bg-slate-50 border-b border-slate-200 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Motorcycle Workshop Queue & Tracking System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Your Motorcycle <br />
            Deserves <span className="text-blue-600">Expert Care</span>
          </h1>

          <p className="text-slate-600 text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
            Certified mechanics, genuine parts, and live status telemetry. Monitor your service progress in real time without the guesswork.
          </p>

          {/* Clean Input Search Bar */}
          <div className="pt-2 max-w-lg mx-auto lg:mx-0">
            <form
              onSubmit={handleTrackSubmit}
              className="bg-white border border-slate-300 p-2 rounded-2xl flex flex-col sm:flex-row gap-2 shadow-sm focus-within:border-blue-600 transition"
            >
              <div className="flex-1 flex items-center gap-2.5 px-3">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Enter Ticket Code (e.g. MC-2026)"
                  className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-sm focus:outline-none uppercase font-semibold"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              >
                <span>Track Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <p className="text-xs text-slate-500 mt-2">
              Try sample ticket code: <button type="button" onClick={() => setTrackingCode('MC-2026')} className="text-blue-600 font-semibold underline">MC-2026</button>
            </p>
          </div>

          {/* Badges */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Certified Mechanics</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>4.9 / 5 Customer Rating</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-blue-600" />
              <span>Quality Service Warranty</span>
            </div>
          </div>
        </div>

        {/* Right Preview Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700">Live Workshop Dispatch</span>
              </div>
              <span className="text-xs text-slate-500">Santa Maria Branch</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Sample Ticket</span>
                <span className="text-blue-600 font-bold">MC-2026</span>
              </div>
              <div className="text-sm font-semibold text-slate-800">Comprehensive CVT Cleaning & Tuning</div>
              <div className="inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                In Progress • Bay 02
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-3 rounded-xl transition"
            >
              Sign In to View Rider Garage
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}