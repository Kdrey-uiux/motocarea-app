import { RotateCw, Disc, Settings, Wrench, Sliders, Zap, Gauge, Layers } from 'lucide-react';

export default function ServicesSection() {
  const serviceList = [
    {
      icon: <RotateCw className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Oil Change',
      desc: 'Full synthetic oil replacement, filter change, and strainer cleaning for smooth engine life.'
    },
    {
      icon: <Disc className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Brake Service',
      desc: 'Brake pad replacement, caliper cleaning, rotor inspection, and hydraulic fluid bleeding.'
    },
    {
      icon: <Settings className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Engine Repair',
      desc: 'Valve clearance adjustment, cylinder block overhaul, and precision engine tune-ups.'
    },
    {
      icon: <Wrench className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'General Service',
      desc: 'Multi-point safety inspection, throttle body cleaning, and complete bolt retightening.'
    },
    {
      icon: <Sliders className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Custom Mods',
      desc: 'Suspension upgrades, exhaust fitting, handlebar setup, and performance tuning.'
    },
    {
      icon: <Zap className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Electrical Diagnostics',
      desc: 'Battery load testing, stator and regulator rectifier check, wiring repair, and LED setup.'
    },
    {
      icon: <Gauge className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Tire & Wheel Service',
      desc: 'Tire replacement, wheel balancing, rim truing, and tire puncture repairs.'
    },
    {
      icon: <Layers className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'CVT / Chain & Sprocket',
      desc: 'CVT belt, flyball, and clutch lining cleaning for scooters, plus drive chain maintenance.'
    }
  ];

  return (
    <section id="services" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-orange-600 text-xs font-bold tracking-wider uppercase bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full">
            What We Offer
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight pt-1">
            Certified Workshop Services
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            From routine preventive maintenance to deep technical diagnostics, our certified mechanics handle your motorcycle with care.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {serviceList.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-orange-300 transition-all duration-200 group"
            >
              <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200/70 flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:border-orange-500 transition-colors shadow-2xs">
                {item.icon}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1.5 group-hover:text-orange-600 transition-colors">
                {item.title}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}