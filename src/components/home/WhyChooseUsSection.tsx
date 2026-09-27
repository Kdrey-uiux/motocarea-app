import { ShieldCheck, Award, Clock, Search, CheckCircle2, Phone } from 'lucide-react';

export default function WhyChooseUsSection() {
  const perks = [
    {
      icon: <ShieldCheck className="w-5 h-5 text-blue-600" />,
      title: 'Certified Technicians',
      desc: 'Skilled mechanics trained in standard operating procedures and diagnostics.'
    },
    {
      icon: <Award className="w-5 h-5 text-blue-600" />,
      title: 'Genuine OEM Parts',
      desc: 'Only authentic and certified replacement parts used for your bike’s safety.'
    },
    {
      icon: <Clock className="w-5 h-5 text-blue-600" />,
      title: 'Prompt Turnaround',
      desc: 'Automated queue scheduling to respect your time and release your unit promptly.'
    },
    {
      icon: <Search className="w-5 h-5 text-blue-600" />,
      title: 'Real-time Tracking',
      desc: 'Direct online updates from initial check-in until ready for pickup.'
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
      title: 'Service Warranty',
      desc: 'Guaranteed repair quality backed by our comprehensive warranty period.'
    },
    {
      icon: <Phone className="w-5 h-5 text-blue-600" />,
      title: 'Rider Support',
      desc: 'Direct communication with workshop advisors for estimates and consultations.'
    }
  ];

  return (
    <section id="why-us" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-blue-600 text-xs font-bold tracking-wider uppercase">Why MotoCare</span>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Why Choose Us</h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Dedicated to giving your motorcycle the highest standard of service and care.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {perks.map((p, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-blue-400 transition">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
                {p.icon}
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-1">{p.title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}