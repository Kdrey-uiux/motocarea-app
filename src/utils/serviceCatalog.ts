export type ServiceCategoryKey = 
  | 'all' 
  | 'diagnostic' 
  | 'maintenance' 
  | 'transmission' 
  | 'engine' 
  | 'brakes' 
  | 'electrical' 
  | 'custom';

export interface ServiceCategoryOption {
  id: ServiceCategoryKey;
  label: string;
  badge?: string;
}

export const SERVICE_CATEGORIES: ServiceCategoryOption[] = [
  { id: 'all', label: 'All Services' },
  { id: 'diagnostic', label: "I'm Not Sure / Diagnostic" },
  { id: 'maintenance', label: 'PMS & Fluids' },
  { id: 'transmission', label: 'CVT & Transmission' },
  { id: 'engine', label: 'Engine & Fuel' },
  { id: 'brakes', label: 'Brakes & Wheels' },
  { id: 'electrical', label: 'Electrical & Battery' },
  { id: 'custom', label: 'Custom & Upgrades' },
];

export interface UnifiedServicePackage {
  id: string;
  name: string;
  title: string;
  category: ServiceCategoryKey;
  tag?: string;
  estimatedTime: string;
  estimatedDuration: string;
  priceRange: string;
  estimatedCost: string;
  basePrice?: number;
  recommendedBay: string;
  description: string;
  checklist: string[];
  inclusions: string[];
  isDiagnostic?: boolean;
}

export const BASE_MOTORCYCLE_SERVICES: UnifiedServicePackage[] = [
  {
    id: 'Mechanic Diagnostic & Road Assessment',
    name: 'Mechanic Diagnostic & Road Assessment',
    title: 'Mechanic Diagnostic & Road Assessment',
    category: 'diagnostic',
    tag: 'For Unsure Issues',
    estimatedTime: '30 – 45 mins',
    estimatedDuration: '30 - 45 mins',
    priceRange: '₱300 - ₱500',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 300,
    recommendedBay: 'Bay 04 - Diagnostic Station',
    description: 'Senior mechanics perform a comprehensive physical inspection, diagnostic scan, and road test to pinpoint exact issues before giving you an official quote.',
    checklist: [
      'Comprehensive mechanical, electrical, and chassis inspection',
      'Road vibration, handling, and engine knocking diagnosis',
      'Detailed diagnostic findings report & transparent parts estimate',
      '₱0 downpayment — your approval required before any repair begins',
    ],
    inclusions: [
      'Comprehensive mechanical, electrical, and chassis inspection',
      'Road vibration, handling, and engine knocking diagnosis',
      'Detailed diagnostic findings report & transparent parts estimate',
      '₱0 downpayment — your approval required before any repair begins',
    ],
    isDiagnostic: true,
  },
  {
    id: 'Change Oil & Routine Inspection',
    name: 'Standard Oil Change & Safety Inspection',
    title: 'Standard Oil Change & Safety Inspection',
    category: 'maintenance',
    tag: 'Essential Care',
    estimatedTime: '30 – 45 mins',
    estimatedDuration: '30 - 45 mins',
    priceRange: '₱350 - ₱650',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 350,
    recommendedBay: 'Bay 01 - Quick Lube Express',
    description: 'Manufacturer-grade 4-stroke or scooter engine oil replacement tailored to your engine specifications, complete with washer renewal, strainer check, and safety inspection.',
    checklist: [
      'Manufacturer-grade synthetic engine oil refill',
      'Magnetic drain plug cleaning & new crush washer',
      'Tire pressure calibration & brake free-play adjustment',
      'Complimentary multi-point digital chassis check',
    ],
    inclusions: [
      'Manufacturer-grade synthetic engine oil refill',
      'Magnetic drain plug cleaning & new crush washer',
      'Tire pressure calibration & brake free-play adjustment',
      'Complimentary multi-point digital chassis check',
    ],
  },
  {
    id: 'Full PMS & Valve Clearance Check',
    name: 'Master Comprehensive PMS',
    title: 'Master Comprehensive PMS',
    category: 'maintenance',
    tag: 'Most Popular',
    estimatedTime: '2.5 – 3.5 hrs',
    estimatedDuration: '2.5 - 3.5 hrs',
    priceRange: '₱1,200 - ₱2,000',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 1200,
    recommendedBay: 'Bay 03 - Engine Overhaul Bay',
    description: 'Total bumper-to-bumper preventive maintenance, valve clearance check, spark plug calibration, and chassis torquing to maintain optimal reliability.',
    checklist: [
      'Precision intake & exhaust valve clearance adjustment',
      'Spark plug electrode gap calibration & cleaning',
      'Full chassis, suspension, & swingarm bolt torquing',
      'Air filter, oil strainer, & throttle cleaning inspection',
    ],
    inclusions: [
      'Precision intake & exhaust valve clearance adjustment',
      'Spark plug electrode gap calibration & cleaning',
      'Full chassis, suspension, & swingarm bolt torquing',
      'Air filter, oil strainer, & throttle cleaning inspection',
    ],
  },
  {
    id: 'Radiator Coolant Flush & System Bleed',
    name: 'Radiator Flush & Cooling System Service',
    title: 'Radiator Flush & Cooling System Service',
    category: 'maintenance',
    tag: 'Overheating Prevention',
    estimatedTime: '45 mins – 1 hr',
    estimatedDuration: '45 mins - 1 hr',
    priceRange: '₱400 - ₱700',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 400,
    recommendedBay: 'Bay 01 - Quick Lube Express',
    description: 'Drain, chemical degrease flush, and high-temp anti-corrosion coolant refill with air bleeding for liquid-cooled engines.',
    checklist: [
      'Complete chemical radiator & hose flush',
      'Premium anti-boil, anti-rust ethylene glycol coolant refill',
      'Water pump seal, radiator cap, and thermostat cycle test',
      'Cooling system air bleed to eliminate engine hotspots',
    ],
    inclusions: [
      'Complete chemical radiator & hose flush',
      'Premium anti-boil, anti-rust ethylene glycol coolant refill',
      'Water pump seal, radiator cap, and thermostat cycle test',
      'Cooling system air bleed to eliminate engine hotspots',
    ],
  },
  {
    id: 'CVT Cleaning, Regrease & Belt Check',
    name: 'CVT Overhaul, Regrease & Pulley Service',
    title: 'CVT Overhaul, Regrease & Pulley Service',
    category: 'transmission',
    tag: 'Best for Scooters',
    estimatedTime: '1 – 1.5 hrs',
    estimatedDuration: '1 - 1.5 hrs',
    priceRange: '₱550 - ₱850',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 550,
    recommendedBay: 'Bay 02 - CVT & Transmission Lab',
    description: 'Restores scooter acceleration, eliminates shuddering at low speeds, and services drive belt, rollers, torque spring, and pulleys.',
    checklist: [
      'Drive belt micro-crack & width measurement',
      'Variator pulley & roller weight cleaning and inspection',
      'Clutch bell & shoe deglazing and sanding',
      'High-temperature torque spring regreasing',
    ],
    inclusions: [
      'Drive belt micro-crack & width measurement',
      'Variator pulley & roller weight cleaning and inspection',
      'Clutch bell & shoe deglazing and sanding',
      'High-temperature torque spring regreasing',
    ],
  },
  {
    id: 'Drive Chain & Sprocket Replacement / Overhaul',
    name: 'Drive Chain & Sprockets Overhaul',
    title: 'Drive Chain & Sprockets Overhaul',
    category: 'transmission',
    tag: 'Manual & Underbone',
    estimatedTime: '45 mins – 1 hr',
    estimatedDuration: '45 mins - 1 hr',
    priceRange: '₱450 - ₱750',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 450,
    recommendedBay: 'Bay 01 - Quick Lube Express',
    description: 'Heavy-duty drive chain cleaning, tensioning, sprocket tooth alignment, or complete sprocket set replacement.',
    checklist: [
      'Front countershaft & rear wheel sprocket tooth wear check',
      'Drive chain ultrasonic cleaning & synthetic waxing',
      'Rear wheel axle alignment & swingarm slack adjustment',
      'Drive chain master link safety clip or rivet inspection',
    ],
    inclusions: [
      'Front countershaft & rear wheel sprocket tooth wear check',
      'Drive chain ultrasonic cleaning & synthetic waxing',
      'Rear wheel axle alignment & swingarm slack adjustment',
      'Drive chain master link safety clip or rivet inspection',
    ],
  },
  {
    id: 'Manual Clutch Lining Replacement & Cable Tune',
    name: 'Manual Clutch Lining & Cable Replacement',
    title: 'Manual Clutch Lining & Cable Replacement',
    category: 'transmission',
    tag: 'Manual Transmission',
    estimatedTime: '1.5 – 2 hrs',
    estimatedDuration: '1.5 - 2 hrs',
    priceRange: '₱700 - ₱1,200',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 700,
    recommendedBay: 'Bay 02 - CVT & Transmission Lab',
    description: 'Eliminates clutch slippage on acceleration, replaces friction plates, and adjusts clutch free-play for crisp gear shifts.',
    checklist: [
      'Friction plate & steel clutch plate thickness inspection',
      'Clutch pressure spring tension measurement',
      'Clutch release cable lubrication or replacement',
      'Crankcase clutch cover gasket renewal & fresh oil refill',
    ],
    inclusions: [
      'Friction plate & steel clutch plate thickness inspection',
      'Clutch pressure spring tension measurement',
      'Clutch release cable lubrication or replacement',
      'Crankcase clutch cover gasket renewal & fresh oil refill',
    ],
  },
  {
    id: 'Gearbox & Final Drive Oil Service',
    name: 'Final Drive & Gearbox Oil Service',
    title: 'Final Drive & Gearbox Oil Service',
    category: 'transmission',
    tag: 'Scooter Maintenance',
    estimatedTime: '20 – 30 mins',
    estimatedDuration: '20 - 30 mins',
    priceRange: '₱250 - ₱450',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 250,
    recommendedBay: 'Bay 01 - Quick Lube Express',
    description: 'Protects rear gear differential and bearings from metal shaving wear with high-pressure synthetic gear lubricant.',
    checklist: [
      'High-pressure SAE synthetic gear oil refill',
      'Magnetic gear case drain plug inspection for metal shavings',
      'Rear hub bearing seal & breather hose inspection',
      'Crush washer replacement on fill and drain bolts',
    ],
    inclusions: [
      'High-pressure SAE synthetic gear oil refill',
      'Magnetic gear case drain plug inspection for metal shavings',
      'Rear hub bearing seal & breather hose inspection',
      'Crush washer replacement on fill and drain bolts',
    ],
  },
  {
    id: 'FI Diagnostic & Throttle Body Cleaning',
    name: 'Fuel Injection Diagnostic & Throttle Body Service',
    title: 'Fuel Injection Diagnostic & Throttle Body Service',
    category: 'engine',
    tag: 'Fuel Efficiency',
    estimatedTime: '1 – 1.5 hrs',
    estimatedDuration: '1 - 1.5 hrs',
    priceRange: '₱650 - ₱1,100',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 650,
    recommendedBay: 'Bay 04 - Diagnostic Station',
    description: 'Computer scanner diagnostics, ultrasonic injector cleaning, and throttle body degreasing for crisp response and smooth idle.',
    checklist: [
      'ECU scanner diagnostics & fault code history clearing',
      'Throttle body butterfly & idle air control valve cleaning',
      'Ultrasonic fuel injector spray pattern test & cleaning',
      'Throttle Position Sensor (TPS) and idle recalibration',
    ],
    inclusions: [
      'ECU scanner diagnostics & fault code history clearing',
      'Throttle body butterfly & idle air control valve cleaning',
      'Ultrasonic fuel injector spray pattern test & cleaning',
      'Throttle Position Sensor (TPS) and idle recalibration',
    ],
  },
  {
    id: 'Carburetor Overhaul, Jet Tuning & Ultrasonic Clean',
    name: 'Carburetor Overhaul & Jet Tuning',
    title: 'Carburetor Overhaul & Jet Tuning',
    category: 'engine',
    tag: 'Carb Tuning',
    estimatedTime: '1 – 1.5 hrs',
    estimatedDuration: '1 - 1.5 hrs',
    priceRange: '₱500 - ₱850',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 500,
    recommendedBay: 'Bay 02 - CVT & Transmission Lab',
    description: 'Fixes hard starting, fuel flooding, and hesitation through complete disassembly, jet cleaning, and air-fuel ratio tuning.',
    checklist: [
      'Full carburetor disassembly and ultrasonic solvent bath',
      'Pilot jet, main jet, and needle valve cleaning',
      'Float level height measurement and fuel leak test',
      'Air-fuel mixture screw and idle speed synchronization',
    ],
    inclusions: [
      'Full carburetor disassembly and ultrasonic solvent bath',
      'Pilot jet, main jet, and needle valve cleaning',
      'Float level height measurement and fuel leak test',
      'Air-fuel mixture screw and idle speed synchronization',
    ],
  },
  {
    id: 'Top Engine Overhaul & Carbon Decarbonization',
    name: 'Top Engine Overhaul & Decarbonization',
    title: 'Top Engine Overhaul & Decarbonization',
    category: 'engine',
    tag: 'Power Restoration',
    estimatedTime: '4 – 6 hrs',
    estimatedDuration: '4 - 6 hrs',
    priceRange: '₱2,000 - ₱3,500',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 2000,
    recommendedBay: 'Bay 03 - Engine Overhaul Bay',
    description: 'Removes heavy carbon buildup, replaces cylinder head gasket, reseats valves, and restores factory cylinder compression.',
    checklist: [
      'Cylinder head disassembly, valve lap grinding, & reseating',
      'Combustion chamber & piston crown carbon scraping',
      'New valve stem oil seals & cylinder head gasket installation',
      'Piston ring gap measurement & compression gauge test',
    ],
    inclusions: [
      'Cylinder head disassembly, valve lap grinding, & reseating',
      'Combustion chamber & piston crown carbon scraping',
      'New valve stem oil seals & cylinder head gasket installation',
      'Piston ring gap measurement & compression gauge test',
    ],
  },
  {
    id: 'Brake Caliper Overhaul & Fluid Flush',
    name: 'Hydraulic Brake Caliper Service & Fluid Flush',
    title: 'Hydraulic Brake Caliper Service & Fluid Flush',
    category: 'brakes',
    tag: 'Safety Essential',
    estimatedTime: '45 mins – 1 hr',
    estimatedDuration: '45 mins - 1 hr',
    priceRange: '₱450 - ₱750',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 450,
    recommendedBay: 'Bay 01 or Bay 04',
    description: 'Eliminates spongy brake levers, replaces contaminated hydraulic fluid with DOT 4, and services sticky caliper pistons.',
    checklist: [
      'High-temp DOT 4 synthetic hydraulic fluid bleed & refill',
      'Brake caliper piston cleaning, degrease, & seal lubrication',
      'Brake pad friction material thickness & rotor runout check',
      'Master cylinder reservoir seal & lever pivot lubrication',
    ],
    inclusions: [
      'High-temp DOT 4 synthetic hydraulic fluid bleed & refill',
      'Brake caliper piston cleaning, degrease, & seal lubrication',
      'Brake pad friction material thickness & rotor runout check',
      'Master cylinder reservoir seal & lever pivot lubrication',
    ],
  },
  {
    id: 'Brake Shoe & Drum Brake Reconditioning',
    name: 'Rear Drum Brake & Shoe Service',
    title: 'Rear Drum Brake & Shoe Service',
    category: 'brakes',
    tag: 'Rear Brake Care',
    estimatedTime: '30 – 45 mins',
    estimatedDuration: '30 - 45 mins',
    priceRange: '₱300 - ₱550',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 300,
    recommendedBay: 'Bay 01 - Quick Lube Express',
    description: 'Eliminates rear brake screeching and weak braking power through hub cleaning, shoe inspection, and cam lever lubrication.',
    checklist: [
      'Rear brake drum hub dust blowout & surface deglazing',
      'Brake shoe lining thickness measurement & wear check',
      'Brake cam shaft and return spring greasing',
      'Brake rod linkage free-play adjustment',
    ],
    inclusions: [
      'Rear brake drum hub dust blowout & surface deglazing',
      'Brake shoe lining thickness measurement & wear check',
      'Brake cam shaft and return spring greasing',
      'Brake rod linkage free-play adjustment',
    ],
  },
  {
    id: 'Fork Oil Replacement & Front Suspension Rebuild',
    name: 'Front Fork Oil & Seal Replacement',
    title: 'Front Fork Oil & Seal Replacement',
    category: 'brakes',
    tag: 'Handling & Comfort',
    estimatedTime: '1.5 – 2 hrs',
    estimatedDuration: '1.5 - 2 hrs',
    priceRange: '₱800 - ₱1,400',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 800,
    recommendedBay: 'Bay 03 - Engine Overhaul Bay',
    description: 'Restores front suspension rebound, stops oil leaks on stanchions, and eliminates front-end bottoming-out over bumps.',
    checklist: [
      'Complete front fork disassembly & degrease cleaning',
      'High-viscosity hydraulic fork oil replenishment',
      'Replacement of oil seals & dust seals (if leaking)',
      'Equal-damping height calibration & steering head check',
    ],
    inclusions: [
      'Complete front fork disassembly & degrease cleaning',
      'High-viscosity hydraulic fork oil replenishment',
      'Replacement of oil seals & dust seals (if leaking)',
      'Equal-damping height calibration & steering head check',
    ],
  },
  {
    id: 'Tire Replacement, Wheel Balancing & Alignment',
    name: 'Tire Mounting, Balancing & Wheel Inspection',
    title: 'Tire Mounting, Balancing & Wheel Inspection',
    category: 'brakes',
    tag: 'Road Safety',
    estimatedTime: '30 – 45 mins',
    estimatedDuration: '30 - 45 mins',
    priceRange: '₱300 - ₱600',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 300,
    recommendedBay: 'Bay 01 - Quick Lube Express',
    description: 'Professional scratch-free tire mounting, tubeless tire valve replacement, wheel truing, and rim bead leak inspection.',
    checklist: [
      'Machine-assisted rim-safe tire removal and installation',
      'New rubber / metal angled tubeless valve stem installation',
      'Bead seating airtight seal test with rim leak check',
      'Wheel rim runout, spoke tension, and wheel bearing test',
    ],
    inclusions: [
      'Machine-assisted rim-safe tire removal and installation',
      'New rubber / metal angled tubeless valve stem installation',
      'Bead seating airtight seal test with rim leak check',
      'Wheel rim runout, spoke tension, and wheel bearing test',
    ],
  },
  {
    id: 'Electrical & Battery Diagnostics',
    name: 'Electrical System, Stator & Battery Diagnostic',
    title: 'Electrical System, Stator & Battery Diagnostic',
    category: 'electrical',
    tag: 'Starting & Charging',
    estimatedTime: '45 mins – 1 hr',
    estimatedDuration: '45 mins - 1 hr',
    priceRange: '₱400 - ₱750',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 400,
    recommendedBay: 'Bay 04 - Electrical Station',
    description: 'Pinpoints battery draining, hard cranking, dead stator coils, and regulator-rectifier overcharging issues.',
    checklist: [
      'Battery conductance & cold-cranking ampere (CCA) load test',
      'Stator AC output voltage and regulator charging circuit test',
      'Starter motor relay, ignition coil, and main fuse inspection',
      'Parasitic ground drain test to eliminate overnight battery drain',
    ],
    inclusions: [
      'Battery conductance & cold-cranking ampere (CCA) load test',
      'Stator AC output voltage and regulator charging circuit test',
      'Starter motor relay, ignition coil, and main fuse inspection',
      'Parasitic ground drain test to eliminate overnight battery drain',
    ],
  },
  {
    id: 'Wiring Harness Rewire & Lighting Installation',
    name: 'Wiring Harness Restoration & Auxiliary Lighting',
    title: 'Wiring Harness Restoration & Auxiliary Lighting',
    category: 'electrical',
    tag: 'Electrical Care',
    estimatedTime: '1 – 2 hrs',
    estimatedDuration: '1 - 2 hrs',
    priceRange: '₱600 - ₱1,200',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 600,
    recommendedBay: 'Bay 04 - Electrical Station',
    description: 'Resolves short circuits, exposed frayed wiring, burnt sockets, and integrates fused auxiliary mini-driving lights.',
    checklist: [
      'Heat-shrink waterproof harness wire soldering & routing',
      'Headlight, taillight, turn signal, and horn circuit test',
      'Dedicated fused relay harness installation for accessories',
      'Ignition switch key cylinder & handlebar switch cleaning',
    ],
    inclusions: [
      'Heat-shrink waterproof harness wire soldering & routing',
      'Headlight, taillight, turn signal, and horn circuit test',
      'Dedicated fused relay harness installation for accessories',
      'Ignition switch key cylinder & handlebar switch cleaning',
    ],
  },
  {
    id: 'Custom Modifications & Performance Tuning',
    name: 'Custom Mods & Performance Upgrades',
    title: 'Custom Mods & Performance Upgrades',
    category: 'custom',
    tag: 'Aftermarket & Styling',
    estimatedTime: '1.5 – 3 hrs',
    estimatedDuration: '1.5 - 3 hrs',
    priceRange: '₱600 - ₱1,500',
    estimatedCost: 'Quoted on Inspection',
    basePrice: 600,
    recommendedBay: 'Bay 02 or Bay 03',
    description: 'Professional installation of aftermarket accessories, suspension upgrades, exhaust systems, handlebars, and cosmetic enhancements.',
    checklist: [
      'Aftermarket exhaust system & header pipe fitting',
      'Upgraded front & rear shock suspension installation',
      'Custom handlebar, side mirror, & lever set alignment',
      'Crash guard, top box bracket, & accessory mount installation',
    ],
    inclusions: [
      'Aftermarket exhaust system & header pipe fitting',
      'Upgraded front & rear shock suspension installation',
      'Custom handlebar, side mirror, & lever set alignment',
      'Crash guard, top box bracket, & accessory mount installation',
    ],
  },
];

const SHARED_SERVICES_STORAGE_KEY = 'motocare_shared_services_catalog_v2';

export function getSharedServiceCatalog(): UnifiedServicePackage[] {
  try {
    const saved = localStorage.getItem(SHARED_SERVICES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return BASE_MOTORCYCLE_SERVICES;
}

export function saveSharedServiceCatalog(updated: UnifiedServicePackage[]): void {
  try {
    localStorage.setItem(SHARED_SERVICES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('motocare_services_updated'));
  } catch {
    // ignore
  }
}
