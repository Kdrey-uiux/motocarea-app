import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ShieldCheck, Award, Bike } from 'lucide-react';

export default function Hero() {
  const [ticketDigits, setTicketDigits] = useState('');
  const navigate = useNavigate();

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = ticketDigits.trim();
    if (cleanDigits) {
      navigate(`/track/MC-${cleanDigits}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extract only digits up to 6 characters (e.g. pastes like MC-1234 become 1234)
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setTicketDigits(digitsOnly);
  };

  return (
    <section id="tracking-hero" className="scroll-mt-16 sm:scroll-mt-20 bg-slate-100/50 border-b border-slate-200/80 py-14 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold shadow-2xs">
          <Bike className="w-3.5 h-3.5 text-orange-500" />
          <span>Motorcycle Workshop Queue & Tracking System</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
          Your Motorcycle <br />
          Deserves <span className="text-orange-500">Expert Care</span>
        </h1>

        {/* Subtitle */}
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          Certified mechanics, genuine parts, and live status telemetry. Monitor your service progress in real time without the guesswork.
        </p>

        {/* Clean Input Search Bar with Permanent "MC-" Prefix */}
        <div className="pt-2 max-w-xl mx-auto w-full">
          <form
            onSubmit={handleTrackSubmit}
            className="bg-white border border-slate-200/90 p-1.5 sm:p-2 rounded-2xl sm:rounded-full flex flex-col sm:flex-row gap-2 shadow-xs focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition"
          >
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 sm:py-0">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              
              {/* Permanent Styled MC- Badge */}
              <div className="px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-700 font-bold font-mono text-xs sm:text-sm select-none shrink-0 flex items-center">
                MC-
              </div>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={ticketDigits}
                onChange={handleInputChange}
                placeholder=""
                className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none font-mono font-bold tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={!ticketDigits.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-full transition flex items-center justify-center gap-2 active:scale-95 shadow-sm shadow-orange-500/20 cursor-pointer whitespace-nowrap"
            >
              <span>Track Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Badges */}
        <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 gap-y-2 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Certified Mechanics</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Search className="w-4 h-4 text-orange-500 shrink-0" />
            <span>Real-time Tracking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-orange-500 shrink-0" />
            <span>Service Warranty</span>
          </div>
        </div>

      </div>
    </section>
  );
}