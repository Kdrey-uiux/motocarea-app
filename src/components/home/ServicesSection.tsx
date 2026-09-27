import { RotateCw, Disc, Settings, Wrench, Sliders, Zap, Gauge, Layers } from 'lucide-react';

export default function ServicesSection() {
  const serviceList = [
    {
      icon: <RotateCw className="w-5 h-5 text-blue-600" />,
      title: 'Oil Change',
      desc: 'Full synthetic oil replacement, filter change, and strainer cleaning for smooth engine life.'
    },
    {
      icon: <Disc className="w-5 h-5 text-blue-600" />,
      title: 'Brake Service',
      desc: 'Brake pad replacement, caliper cleaning, rotor inspection, and hydraulic fluid bleeding.'
    },
    {
      icon: <Settings className="w-5 h-5 text-blue-600" />,
      title: 'Engine Repair',
      desc: 'Valve clearance adjustment, cylinder block overhaul, and precision engine tune-ups.'
    },
    {
      icon: <Wrench className="w-5 h-5 text-blue-600" />,
      title: 'General Service',
      desc: 'Multi-point safety inspection, throttle body cleaning, and complete bolt retightening.'
    },
    {
      icon: <Sliders className="w-5 h-5 text-blue-600" />,
      title: 'Custom Mods',
      desc: 'Suspension upgrades, exhaust fitting, handlebar setup, and performance tuning.'
    },
    {
      icon: <Zap className="w-5 h-5 text-blue-600" />,
      title: 'Electrical Diagnostics',
      desc: 'Battery load testing, stator and regulator rectifier check, wiring repair, and LED setup.'
    },
    {
      icon: <Gauge className="w-5 h-5 text-blue-600" />,
      title: 'Tire & Wheel Service',
      desc: 'Tire replacement, wheel balancing, rim truing, and tire puncture repairs.'
    },
    {
      icon: <Layers className="w-5 h-5 text-blue-600" />,
      title: 'CVT / Chain & Sprocket',
      desc: 'CVT belt, flyball, and clutch lining cleaning for scooters, plus drive chain maintenance.'
    }
  ];

  return (
    <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-orange-600 text-xs font-bold tracking-wider uppercase">What We Offer</span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Our Services</h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            From routine maintenance to complex troubleshooting, our certified mechanics handle your motorcycle with care.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {serviceList.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-blue-400 transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {item.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-blue-600 transition-colors">
                {item.title}
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}