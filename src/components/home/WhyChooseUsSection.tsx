import { ShieldCheck, Award, Clock, Search, CheckCircle2, Phone } from 'lucide-react';

export default function WhyChooseUsSection() {
  const perks = [
    {
      icon: <ShieldCheck className="w-5 h-5 text-orange-500" />,
      title: 'Certified Technicians',
      desc: 'Skilled mechanics trained in standard operating procedures and diagnostics.'
    },
    {
      icon: <Award className="w-5 h-5 text-orange-500" />,
      title: 'Genuine OEM Parts',
      desc: 'Only authentic and certified replacement parts used for your bike’s safety.'
    },
    {
      icon: <Clock className="w-5 h-5 text-orange-500" />,
      title: 'Prompt Turnaround',
      desc: 'Automated queue scheduling to respect your time and release your unit promptly.'
    },
    {
      icon: <Search className="w-5 h-5 text-orange-500" />,
      title: 'Real-time Tracking',
      desc: 'Direct online updates from initial check-in until ready for pickup.'
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-orange-500" />,
      title: 'Service Warranty',
      desc: 'Guaranteed repair quality backed by our comprehensive warranty period.'
    },
    {
      icon: <Phone className="w-5 h-5 text-orange-500" />,
      title: 'Rider Support',
      desc: 'Direct communication with workshop advisors for estimates and consultations.'
    }
  ];

  return (
    <section id="why-us" className="scroll-mt-16 sm:scroll-mt-20 py-12 sm:py-20 px-3.5 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-orange-600 text-xs font-bold tracking-wider uppercase bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full">
            Why MotoCare
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight pt-1">
            Why Choose Us
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto">
            Dedicated to giving your motorcycle the highest standard of service and care.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {perks.map((p, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-6 shadow-2xs hover:shadow-md hover:border-orange-300 transition duration-150 flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-50 border border-orange-200/70 flex items-center justify-center mb-2.5 sm:mb-3.5 shadow-2xs shrink-0">
                  {p.icon}
                </div>
                <h3 className="font-bold text-xs sm:text-base text-slate-900 mb-1 leading-snug">
                  {p.title}
                </h3>
                <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed line-clamp-3 sm:line-clamp-none">
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}