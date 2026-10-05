import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ShieldCheck, Star, Award, Sparkles, Wrench } from 'lucide-react';

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
    <section id="tracking-hero" className="bg-slate-100/50 border-b border-slate-200/80 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Motorcycle Workshop Queue & Tracking System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            Your Motorcycle <br />
            Deserves <span className="text-orange-500">Expert Care</span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
            Certified mechanics, genuine parts, and live status telemetry. Monitor your service progress in real time without the guesswork.
          </p>

          {/* Clean Input Search Bar */}
          <div className="pt-2 max-w-lg mx-auto lg:mx-0">
            <form
              onSubmit={handleTrackSubmit}
              className="bg-white border border-slate-200/90 p-1.5 sm:p-2 rounded-2xl sm:rounded-full flex flex-col sm:flex-row gap-2 shadow-xs focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition"
            >
              <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5 sm:py-0">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Enter Ticket Code (e.g. MC-2026)"
                  className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none uppercase font-semibold"
                />
              </div>
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-full transition flex items-center justify-center gap-2 active:scale-95 shadow-sm shadow-orange-500/20 cursor-pointer whitespace-nowrap"
              >
                <span>Track Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <p className="text-xs text-slate-500 mt-2">
              Try sample ticket code:{' '}
              <button
                type="button"
                onClick={() => setTrackingCode('MC-2026')}
                className="text-orange-600 hover:text-orange-700 font-semibold underline cursor-pointer"
              >
                MC-2026
              </button>
            </p>
          </div>

          {/* Badges */}
          <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Certified Mechanics</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>4.9 / 5 Customer Rating</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-orange-500" />
              <span>Quality Service Warranty</span>
            </div>
          </div>
        </div>

        {/* Right Preview Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-900">Live Workshop Dispatch</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Santa Maria Hub</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-xl sm:rounded-2xl border border-slate-200/70 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Sample Live Ticket</span>
                <span className="font-mono font-bold text-orange-600 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-md text-xs">
                  #MC-2026
                </span>
              </div>
              <div className="text-sm font-bold text-slate-800">Comprehensive CVT Cleaning & Tuning</div>
              <div className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                <Wrench className="w-3 h-3 text-emerald-600" />
                <span>In Progress • Bay 02</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold py-3 rounded-full transition shadow-sm shadow-orange-500/20 active:scale-95 cursor-pointer"
            >
              Sign In to View Rider Garage
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}