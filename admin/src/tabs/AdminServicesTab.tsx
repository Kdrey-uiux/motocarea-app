import { 
  Layers, 
  Clock, 
  CheckCircle2, 
  Wrench 
} from 'lucide-react';

const PACKAGES = [
  {
    name: 'Change Oil & Routine Inspection',
    estimatedTime: '30 – 45 mins',
    priceRange: '₱350 - ₱650',
    recommendedBay: 'Bay 01 - Quick Lube Express',
    description: 'Fast oil change with full synthetic blend and 15-point multi-system inspection.',
    checklist: [
      'Engine oil drain and crankcase magnetic plug cleaning',
      'OEM oil filter / strainer mesh cleaning & inspection',
      'Tire pressure check and tread depth rating',
      'Brake lever free-play and hydraulic fluid inspection',
      'Chain / belt tension alignment & lubrication',
    ],
  },
  {
    name: 'CVT Cleaning, Regrease & Belt Check',
    estimatedTime: '1 – 1.5 hrs',
    priceRange: '₱550 - ₱850',
    recommendedBay: 'Bay 02 - CVT & Transmission Lab',
    description: 'Complete transmission disassembly, degreasing, and high-temperature torque regreasing.',
    checklist: [
      'Drive belt micro-crack, thickness, and deflection audit',
      'Variator pulley ramp check & roller weight flat-spot check',
      'Clutch bell & shoe deglazing / precision sanding',
      'Application of high-temperature CVT torque grease (NLGI 2)',
      'Kick starter gear assembly cleaning & lubrication',
    ],
  },
  {
    name: 'Brake Caliper Overhaul & Fluid Flush',
    estimatedTime: '1 hr',
    priceRange: '₱450 - ₱750',
    recommendedBay: 'Bay 01 or Bay 04',
    description: 'Complete caliper piston cleaning, seal renewal, and DOT 4 hydraulic fluid bleed.',
    checklist: [
      'Caliper piston disassembly and corrosion polishing',
      'Hydraulic line flush with DOT 4 synthetic brake fluid',
      'Brake pad wear thickness and rotor runout check',
      'Master cylinder diaphragm & piston pressure testing',
    ],
  },
  {
    name: 'Full PMS & Valve Clearance Check',
    estimatedTime: '3 – 4 hrs',
    priceRange: '₱1,200 - ₱2,000',
    recommendedBay: 'Bay 03 - Engine Overhaul Bay',
    description: 'Comprehensive top-to-bottom maintenance with precision valve gap adjustment.',
    checklist: [
      'Feeler gauge intake/exhaust valve clearance adjustment',
      'Spark plug electrode gap audit or laser iridium replacement',
      'Full chassis, swingarm, and engine hanger bolt torquing',
      'Radiator coolant specific gravity check & flush (liquid-cooled)',
      'Throttle body ultrasonic cleaning and TPS reset',
    ],
  },
  {
    name: 'Electrical & Battery Diagnostics',
    estimatedTime: '45 mins – 1 hr',
    priceRange: '₱400 - ₱750',
    recommendedBay: 'Bay 04 - Electrical Station',
    description: 'Full electrical charging system test, stator output, and computer diagnostics.',
    checklist: [
      'Battery load test and cold-cranking amp (CCA) analysis',
      'Stator coil 3-phase AC voltage and rectifier diode test',
      'Main fuse box, starter solenoid, and ground wire resistance test',
      'FI scanner error code reading & live sensor parameters log',
    ],
  },
];

export default function AdminServicesTab() {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Workshop Standard Service Catalog & Labor Guide</h2>
        </div>
        <p className="text-xs text-slate-500">
          Official Santa Maria workshop pricing schedule, standard technician labor hours, and technical inspection checklists.
        </p>
      </div>

      {/* Service Packages Cards */}
      <div className="space-y-4">
        {PACKAGES.map((pkg, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition space-y-4"
          >
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  Package 0{idx + 1}
                </span>
                <h3 className="font-bold text-base text-slate-900">{pkg.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Standard Labor & Parts Estimate
                </span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  {pkg.priceRange}
                </span>
              </div>
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Standard Duration</span>
                  <span className="font-bold text-slate-800">{pkg.estimatedTime}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <Wrench className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Assigned Station</span>
                  <span className="font-bold text-slate-800">{pkg.recommendedBay}</span>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Standard Technician Checklist & Scope of Work
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {pkg.checklist.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
