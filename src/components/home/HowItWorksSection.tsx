import { Calendar, Clock, Wrench, CheckCircle2 } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      step: 'STEP 1',
      title: 'Book Online',
      desc: 'Select your preferred service schedule and register your motorcycle profile.',
      icon: <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
    },
    {
      step: 'STEP 2',
      title: 'Shop Drop-Off',
      desc: 'Bring your motorcycle to the shop and get your unique Tracking Ticket Code.',
      icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
    },
    {
      step: 'STEP 3',
      title: 'Expert Servicing',
      desc: 'Our certified mechanics perform repairs while you track the status online in real time.',
      icon: <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
    },
    {
      step: 'STEP 4',
      title: 'Ready for Pickup',
      desc: 'Receive immediate status update when your motorcycle is tested and ready to ride.',
      icon: <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
    }
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-100/50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-14">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-orange-600 text-xs font-bold tracking-wider uppercase bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full">
            Simple Process
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight pt-1">
            How It Works
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm">
            Servicing your motorcycle with full transparency and zero guesswork.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((s, idx) => (
            <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-6 text-center space-y-3 shadow-2xs hover:shadow-sm transition">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto shadow-sm shadow-orange-500/25">
                {s.icon}
              </div>
              <div className="text-[11px] font-bold text-orange-600 tracking-wider">{s.step}</div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">{s.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}