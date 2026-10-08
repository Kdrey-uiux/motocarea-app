import { Droplets, Disc, ShieldCheck, Activity, Sliders, Zap, Gauge, Layers } from 'lucide-react';

export default function ServicesSection() {
  const serviceList = [
    {
      icon: <Droplets className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Oil Change & Inspection',
      desc: 'Manufacturer-grade synthetic oil replacement, magnetic plug cleaning, strainer check, and safety inspection.'
    },
    {
      icon: <Disc className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Brake System Service',
      desc: 'Brake pad replacement, caliper piston overhaul, rotor inspection, and DOT 4 hydraulic fluid bleeding.'
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Comprehensive PMS',
      desc: 'Total preventive maintenance, precision valve clearance check, spark plug calibration, and chassis bolt torquing.'
    },
    {
      icon: <Activity className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'FI & Throttle Body',
      desc: 'Computer scanner diagnostics, fault code clearing, ultrasonic injector cleaning, and throttle body recalibration.'
    },
    {
      icon: <Sliders className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Custom Mods & Upgrades',
      desc: 'Aftermarket exhaust fitting, suspension shock upgrades, crash guards, handlebar setup, and performance accessories.'
    },
    {
      icon: <Zap className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Electrical & Diagnostics',
      desc: 'Battery conductance load testing, stator and regulator rectifier check, wiring repair, and starter circuit tests.'
    },
    {
      icon: <Gauge className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'Tire & Wheel Service',
      desc: 'Scratch-free tire mounting, wheel balancing, rim truing, tubeless valve renewal, and tire puncture repairs.'
    },
    {
      icon: <Layers className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />,
      title: 'CVT & Transmission Care',
      desc: 'Drive belt inspection, pulley and roller weight cleaning, clutch bell deglazing, and high-temp torque regreasing.'
    }
  ];

  return (
    <section id="services" className="scroll-mt-16 sm:scroll-mt-20 py-12 sm:py-20 px-3.5 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-orange-600 text-xs font-bold tracking-wider uppercase bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full">
            What We Offer
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight pt-1">
            Certified Workshop Services
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
            From routine preventive maintenance to deep technical diagnostics, our certified mechanics handle your motorcycle with care.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {serviceList.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[1.75rem] p-3.5 sm:p-6 shadow-2xs hover:shadow-md hover:border-orange-300 transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-orange-50 border border-orange-200/70 flex items-center justify-center mb-2.5 sm:mb-4 group-hover:bg-orange-500 group-hover:border-orange-500 transition-colors shadow-2xs shrink-0">
                  {item.icon}
                </div>
                <h3 className="text-xs sm:text-base font-bold text-slate-900 mb-1 leading-snug group-hover:text-orange-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed line-clamp-3 sm:line-clamp-none">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}