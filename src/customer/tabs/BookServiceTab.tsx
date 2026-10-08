import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Motorcycle, BikeModel, ServiceTicket } from '../../types/dashboard';
import {
  Calendar,
  AlertCircle,
  Loader2,
  Wrench,
  CheckCircle2,
  Search,
  Plus,
  Bike,
  Droplets,
  Settings,
  Activity,
  Disc,
  Zap,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Check,
  Lock,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  XCircle,
  RotateCcw,
  FileText,
  HelpCircle,
  Gauge,
  Sliders,
  CalendarSync
} from 'lucide-react';
import { TabType } from '../../types/dashboard';
import { getBayCapacity, DAILY_MAX_CAPACITY } from '../../utils/mockReservations';
import {
  getCompleteMotorcycleCatalog,
  registerNewMotorcycleModel
} from '../../utils/motorcycleCatalog';
import { rescheduleServiceTicket } from '../../utils/bookingLifecycle';

interface BookServiceTabProps {
  userId: string | null;
  userProfile?: { full_name?: string; phone_number?: string; email?: string } | null;
  motorcycles: Motorcycle[];
  selectedBikeId: string;
  setSelectedBikeId: (id: string) => void;
  activeTickets?: ServiceTicket[];
  serviceHistory?: ServiceTicket[];
  onBookingComplete: () => Promise<void>;
  onNavigateTab?: (tab: TabType) => void;
  onOpenChat?: () => void;
  onRequestCancelTicket?: (ticket: ServiceTicket) => void;
  rescheduleTicket?: ServiceTicket | null;
  onCancelReschedule?: () => void;
}

export type ServiceCategoryKey = 'all' | 'diagnostic' | 'maintenance' | 'transmission' | 'engine' | 'brakes' | 'electrical' | 'custom';

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

export interface ServicePackageOption {
  id: string;
  title: string;
  category: ServiceCategoryKey;
  tag?: string;
  estimatedCost: string;
  basePriceNum?: number;
  estimatedDuration: string;
  description: string;
  inclusions: string[];
  icon: typeof Wrench;
  isDiagnostic?: boolean;
}

export const MOTORCYCLE_SERVICE_PACKAGES: ServicePackageOption[] = [
  {
    id: 'Mechanic Diagnostic & Road Assessment',
    title: 'Mechanic Diagnostic & Road Assessment',
    category: 'diagnostic',
    tag: 'For Unsure Issues',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '30 - 45 mins',
    description: 'Not sure what is wrong with your motorcycle? Senior mechanics perform a comprehensive physical inspection, diagnostic scan, and road test to pinpoint exact issues before giving you an official quote.',
    inclusions: [
      'Comprehensive mechanical, electrical, and chassis inspection',
      'Road vibration, handling, and engine knocking diagnosis',
      'Detailed diagnostic findings report & transparent parts estimate',
      '₱0 downpayment — your approval required before any repair begins',
    ],
    icon: HelpCircle,
    isDiagnostic: true,
  },
  {
    id: 'Change Oil & Routine Inspection',
    title: 'Standard Oil Change & Safety Inspection',
    category: 'maintenance',
    tag: 'Essential Care',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '30 - 45 mins',
    description: 'Manufacturer-grade 4-stroke or scooter engine oil replacement tailored to your engine specifications, complete with washer renewal, strainer check, and safety inspection.',
    inclusions: [
      'Manufacturer-grade synthetic engine oil refill',
      'Magnetic drain plug cleaning & new crush washer',
      'Tire pressure calibration & brake free-play adjustment',
      'Complimentary multi-point digital chassis check',
    ],
    icon: Droplets,
  },
  {
    id: 'Full PMS & Valve Clearance Check',
    title: 'Master Comprehensive PMS',
    category: 'maintenance',
    tag: 'Most Popular',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '2.5 - 3.5 hrs',
    description: 'Total bumper-to-bumper preventive maintenance, valve clearance check, spark plug calibration, and chassis torquing to maintain optimal reliability.',
    inclusions: [
      'Precision intake & exhaust valve clearance adjustment',
      'Spark plug electrode gap calibration & cleaning',
      'Full chassis, suspension, & swingarm bolt torquing',
      'Air filter, oil strainer, & throttle cleaning inspection',
    ],
    icon: ShieldCheck,
  },
  {
    id: 'Radiator Coolant Flush & System Bleed',
    title: 'Radiator Flush & Cooling System Service',
    category: 'maintenance',
    tag: 'Overheating Prevention',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '45 mins - 1 hr',
    description: 'Drain, chemical degrease flush, and high-temp anti-corrosion coolant refill with air bleeding for liquid-cooled engines.',
    inclusions: [
      'Complete chemical radiator & hose flush',
      'Premium anti-boil, anti-rust ethylene glycol coolant refill',
      'Water pump seal, radiator cap, and thermostat cycle test',
      'Cooling system air bleed to eliminate engine hotspots',
    ],
    icon: Droplets,
  },
  {
    id: 'CVT Cleaning, Regrease & Belt Check',
    title: 'CVT Overhaul, Regrease & Pulley Service',
    category: 'transmission',
    tag: 'Best for Scooters',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '1 - 1.5 hrs',
    description: 'Restores scooter acceleration, eliminates shuddering at low speeds, and services drive belt, rollers, torque spring, and pulleys.',
    inclusions: [
      'Drive belt micro-crack & width measurement',
      'Variator pulley & roller weight cleaning and inspection',
      'Clutch bell & shoe deglazing and sanding',
      'High-temperature torque spring regreasing',
    ],
    icon: Settings,
  },
  {
    id: 'Drive Chain & Sprocket Replacement / Overhaul',
    title: 'Drive Chain & Sprockets Overhaul',
    category: 'transmission',
    tag: 'Manual & Underbone',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '45 mins - 1 hr',
    description: 'Heavy-duty drive chain cleaning, tensioning, sprocket tooth alignment, or complete sprocket set replacement.',
    inclusions: [
      'Front countershaft & rear wheel sprocket tooth wear check',
      'Drive chain ultrasonic cleaning & synthetic waxing',
      'Rear wheel axle alignment & swingarm slack adjustment',
      'Drive chain master link safety clip or rivet inspection',
    ],
    icon: RotateCcw,
  },
  {
    id: 'Manual Clutch Lining Replacement & Cable Tune',
    title: 'Manual Clutch Lining & Cable Replacement',
    category: 'transmission',
    tag: 'Manual Transmission',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '1.5 - 2 hrs',
    description: 'Eliminates clutch slippage on acceleration, replaces friction plates, and adjusts clutch free-play for crisp gear shifts.',
    inclusions: [
      'Friction plate & steel clutch plate thickness inspection',
      'Clutch pressure spring tension measurement',
      'Clutch release cable lubrication or replacement',
      'Crankcase clutch cover gasket renewal & fresh oil refill',
    ],
    icon: Settings,
  },
  {
    id: 'Gearbox & Final Drive Oil Service',
    title: 'Final Drive & Gearbox Oil Service',
    category: 'transmission',
    tag: 'Scooter Maintenance',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '20 - 30 mins',
    description: 'Protects rear gear differential and bearings from metal shaving wear with high-pressure synthetic gear lubricant.',
    inclusions: [
      'High-pressure SAE synthetic gear oil refill',
      'Magnetic gear case drain plug inspection for metal shavings',
      'Rear hub bearing seal & breather hose inspection',
      'Crush washer replacement on fill and drain bolts',
    ],
    icon: Droplets,
  },
  {
    id: 'FI Diagnostic & Throttle Body Cleaning',
    title: 'Fuel Injection Diagnostic & Throttle Body Service',
    category: 'engine',
    tag: 'Fuel Efficiency',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '1 - 1.5 hrs',
    description: 'Computer scanner diagnostics, ultrasonic injector cleaning, and throttle body degreasing for crisp response and smooth idle.',
    inclusions: [
      'ECU scanner diagnostics & fault code history clearing',
      'Throttle body butterfly & idle air control valve cleaning',
      'Ultrasonic fuel injector spray pattern test & cleaning',
      'Throttle Position Sensor (TPS) and idle recalibration',
    ],
    icon: Activity,
  },
  {
    id: 'Carburetor Overhaul, Jet Tuning & Ultrasonic Clean',
    title: 'Carburetor Overhaul & Jet Tuning',
    category: 'engine',
    tag: 'Carb Tuning',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '1 - 1.5 hrs',
    description: 'Fixes hard starting, fuel flooding, and hesitation through complete disassembly, jet cleaning, and air-fuel ratio tuning.',
    inclusions: [
      'Full carburetor disassembly and ultrasonic solvent bath',
      'Pilot jet, main jet, and needle valve cleaning',
      'Float level height measurement and fuel leak test',
      'Air-fuel mixture screw and idle speed synchronization',
    ],
    icon: Sliders,
  },
  {
    id: 'Top Engine Overhaul & Carbon Decarbonization',
    title: 'Top Engine Overhaul & Decarbonization',
    category: 'engine',
    tag: 'Power Restoration',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '4 - 6 hrs',
    description: 'Removes heavy carbon buildup, replaces cylinder head gasket, reseats valves, and restores factory cylinder compression.',
    inclusions: [
      'Cylinder head disassembly, valve lap grinding, & reseating',
      'Combustion chamber & piston crown carbon scraping',
      'New valve stem oil seals & cylinder head gasket installation',
      'Piston ring gap measurement & compression gauge test',
    ],
    icon: Wrench,
  },
  {
    id: 'Brake Caliper Overhaul & Fluid Flush',
    title: 'Hydraulic Brake Caliper Service & Fluid Flush',
    category: 'brakes',
    tag: 'Safety Essential',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '45 mins - 1 hr',
    description: 'Eliminates spongy brake levers, replaces contaminated hydraulic fluid with DOT 4, and services sticky caliper pistons.',
    inclusions: [
      'High-temp DOT 4 synthetic hydraulic fluid bleed & refill',
      'Brake caliper piston cleaning, degrease, & seal lubrication',
      'Brake pad friction material thickness & rotor runout check',
      'Master cylinder reservoir seal & lever pivot lubrication',
    ],
    icon: Disc,
  },
  {
    id: 'Brake Shoe & Drum Brake Reconditioning',
    title: 'Rear Drum Brake & Shoe Service',
    category: 'brakes',
    tag: 'Rear Brake Care',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '30 - 45 mins',
    description: 'Eliminates rear brake screeching and weak braking power through hub cleaning, shoe inspection, and cam lever lubrication.',
    inclusions: [
      'Rear brake drum hub dust blowout & surface deglazing',
      'Brake shoe lining thickness measurement & wear check',
      'Brake cam shaft and return spring greasing',
      'Brake rod linkage free-play adjustment',
    ],
    icon: Disc,
  },
  {
    id: 'Fork Oil Replacement & Front Suspension Rebuild',
    title: 'Front Fork Oil & Seal Replacement',
    category: 'brakes',
    tag: 'Handling & Comfort',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '1.5 - 2 hrs',
    description: 'Restores front suspension rebound, stops oil leaks on stanchions, and eliminates front-end bottoming-out over bumps.',
    inclusions: [
      'Complete front fork disassembly & degrease cleaning',
      'High-viscosity hydraulic fork oil replenishment',
      'Replacement of oil seals & dust seals (if leaking)',
      'Equal-damping height calibration & steering head check',
    ],
    icon: Wrench,
  },
  {
    id: 'Tire Replacement, Wheel Balancing & Alignment',
    title: 'Tire Mounting, Balancing & Wheel Inspection',
    category: 'brakes',
    tag: 'Road Safety',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '30 - 45 mins',
    description: 'Professional scratch-free tire mounting, tubeless tire valve replacement, wheel truing, and rim bead leak inspection.',
    inclusions: [
      'Machine-assisted rim-safe tire removal and installation',
      'New rubber / metal angled tubeless valve stem installation',
      'Bead seating airtight seal test with rim leak check',
      'Wheel rim runout, spoke tension, and wheel bearing test',
    ],
    icon: Gauge,
  },
  {
    id: 'Electrical & Battery Diagnostics',
    title: 'Electrical System, Stator & Battery Diagnostic',
    category: 'electrical',
    tag: 'Starting & Charging',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '45 mins - 1 hr',
    description: 'Pinpoints battery draining, hard cranking, dead stator coils, and regulator-rectifier overcharging issues.',
    inclusions: [
      'Battery conductance & cold-cranking ampere (CCA) load test',
      'Stator AC output voltage and regulator charging circuit test',
      'Starter motor relay, ignition coil, and main fuse inspection',
      'Parasitic ground drain test to eliminate overnight battery drain',
    ],
    icon: Zap,
  },
  {
    id: 'Wiring Harness Rewire & Lighting Installation',
    title: 'Wiring Harness Restoration & Auxiliary Lighting',
    category: 'electrical',
    tag: 'Electrical Care',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '1 - 2 hrs',
    description: 'Resolves short circuits, exposed frayed wiring, burnt sockets, and integrates fused auxiliary mini-driving lights.',
    inclusions: [
      'Heat-shrink waterproof harness wire soldering & routing',
      'Headlight, taillight, turn signal, and horn circuit test',
      'Dedicated fused relay harness installation for accessories',
      'Ignition switch key cylinder & handlebar switch cleaning',
    ],
    icon: Zap,
  },
  {
    id: 'Custom Modifications & Performance Tuning',
    title: 'Custom Mods & Performance Upgrades',
    category: 'custom',
    tag: 'Aftermarket & Styling',
    estimatedCost: 'Quoted on Inspection',
    estimatedDuration: '1.5 - 3 hrs',
    description: 'Professional installation of aftermarket accessories, suspension upgrades, exhaust systems, handlebars, and cosmetic enhancements.',
    inclusions: [
      'Aftermarket exhaust system & header pipe fitting',
      'Upgraded front & rear shock suspension installation',
      'Custom handlebar, side mirror, & lever set alignment',
      'Crash guard, top box bracket, & accessory mount installation',
    ],
    icon: Sliders,
  },
];

const TIME_WINDOWS = [
  { id: '08:00 AM - 10:00 AM', label: 'Morning Slot', time: '08:00 AM - 10:00 AM', desc: 'Fastest turnaround, early morning priority' },
  { id: '10:00 AM - 01:00 PM', label: 'Midday Slot', time: '10:00 AM - 01:00 PM', desc: 'Convenient afternoon pickup' },
  { id: '01:00 PM - 04:00 PM', label: 'Afternoon Slot', time: '01:00 PM - 04:00 PM', desc: 'Same-day or next-morning collection' },
];

const COMMON_SYMPTOMS = [
  'Engine won’t start or hard to start',
  'Dragging, shuddering, or sluggish acceleration',
  'Unusual engine ticking, knocking, or rattling noise',
  'Weak or spongy brakes / screeching brake sound',
  'Fluid leak detected (engine oil or radiator coolant)',
  'Engine stalling at idle or jerky throttle response',
  'Heavy engine vibration or wobble at speed',
  'Dead battery, dim lights, or electrical glitch',
  'White or blue smoke coming from exhaust',
  'Steering stiffness or suspension bottoming out',
];

export default function BookServiceTab({
  userId,
  userProfile,
  motorcycles,
  selectedBikeId,
  setSelectedBikeId,
  activeTickets = [],
  serviceHistory = [],
  onBookingComplete,
  onNavigateTab,
  onOpenChat,
  onRequestCancelTicket,
  rescheduleTicket,
  onCancelReschedule,
}: BookServiceTabProps) {
  // Wizard current step: 1 = Service, 2 = Date & Time, 3 = Vehicle, 4 = Review & Confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Active Reschedule state
  const [activeReschedule, setActiveReschedule] = useState<ServiceTicket | null>(rescheduleTicket || null);

  useEffect(() => {
    if (rescheduleTicket) {
      setActiveReschedule(rescheduleTicket);
    }
  }, [rescheduleTicket]);

  // Support reading ?reschedule=MC-XXXX from URL
  useEffect(() => {
    if (!activeReschedule && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('reschedule');
      if (code) {
        const found =
          (serviceHistory || []).find((t) => t.ticket_code === code) ||
          (activeTickets || []).find((t) => t.ticket_code === code);
        if (found) {
          setActiveReschedule(found);
        }
      }
    }
  }, [activeReschedule, serviceHistory, activeTickets]);

  // Step 1: Selected service package, category filter & mobile accordion toggle
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryKey>('all');
  const [serviceType, setServiceType] = useState<string>('');
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);

  // Step 3: Date & arrival window
  const [dropoffDate, setDropoffDate] = useState('');
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(TIME_WINDOWS[0].id);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  // Step 3: Vehicle & symptoms
  const [bikeMode, setBikeMode] = useState<'existing' | 'new'>(
    motorcycles.length > 0 ? 'existing' : 'new'
  );
  const [newBikeModel, setNewBikeModel] = useState('');
  const [newBikePlate, setNewBikePlate] = useState('');
  const [catalog, setCatalog] = useState<BikeModel[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close catalog suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch catalog for model autocomplete
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        const fullCatalog = await getCompleteMotorcycleCatalog();
        if (isMounted) setCatalog(fullCatalog);
      } catch (err) {
        console.error('Catalog fetch error:', err);
      }
    }
    loadCatalog();
  }, []);

  // Ensure selected bike is valid
  useEffect(() => {
    if (motorcycles.length > 0) {
      if (!selectedBikeId || !motorcycles.some((b) => b.id === selectedBikeId)) {
        setSelectedBikeId(motorcycles[0].id);
      }
    } else {
      setBikeMode('new');
    }
  }, [motorcycles, selectedBikeId, setSelectedBikeId]);

  const cleanPlate = (str: string) => str.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // When activeReschedule is present, pre-fill motorcycle, package, and jump directly to Step 3 (Calendar & Time)
  useEffect(() => {
    if (activeReschedule) {
      if (activeReschedule.service_type) {
        setServiceType(activeReschedule.service_type);
      }
      if (activeReschedule.motorcycle_id) {
        setSelectedBikeId(activeReschedule.motorcycle_id);
        setBikeMode('existing');
      } else if (activeReschedule.motorcycles?.plate_number) {
        const clean = cleanPlate(activeReschedule.motorcycles.plate_number);
        const match = motorcycles.find((m) => cleanPlate(m.plate_number) === clean);
        if (match) {
          setSelectedBikeId(match.id);
          setBikeMode('existing');
        }
      }
      // Jump directly to Step 3: Schedule & Time
      setCurrentStep(3);
    }
  }, [activeReschedule, motorcycles, setSelectedBikeId]);

  // Helper: Find if a motorcycle (by ID or Plate) already has an active ongoing ticket in the workshop
  const getActiveTicketForBike = (bikeIdOrPlate?: string) => {
    if (!bikeIdOrPlate || !bikeIdOrPlate.trim()) return null;
    const clean = cleanPlate(bikeIdOrPlate);
    return (activeTickets || []).find((ticket) => {
      if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED' || ticket.status === 'MISSED' || ticket.status === 'NO_SHOW') return false;
      if (activeReschedule && ticket.id === activeReschedule.id) return false;
      const matchId = ticket.motorcycle_id && ticket.motorcycle_id === bikeIdOrPlate;
      const matchPlate = ticket.motorcycles?.plate_number && cleanPlate(ticket.motorcycles.plate_number) === clean;
      return matchId || matchPlate;
    });
  };

  // Real-time detection: Does the currently selected motorcycle have an active ticket in progress?
  const activeTicketForSelectedBike = useMemo(() => {
    if (bikeMode === 'existing') {
      const selectedBike = motorcycles.find((b) => b.id === selectedBikeId) || motorcycles[0];
      if (!selectedBike) return null;
      return getActiveTicketForBike(selectedBike.id) || getActiveTicketForBike(selectedBike.plate_number);
    } else {
      if (!newBikePlate.trim()) return null;
      return getActiveTicketForBike(newBikePlate);
    }
  }, [bikeMode, selectedBikeId, motorcycles, newBikePlate, activeTickets]);

  // Duplicate Check: Same motorcycle cannot be scheduled if it has an active ticket OR already booked on the selected date
  const activeDuplicate = useMemo(() => {
    if (activeTicketForSelectedBike) {
      return activeTicketForSelectedBike;
    }

    const selectedExistingBike = motorcycles.find((b) => b.id === selectedBikeId);
    const targetPlate =
      bikeMode === 'existing' && selectedExistingBike
        ? selectedExistingBike.plate_number
        : newBikePlate;

    if (!targetPlate || !targetPlate.trim()) return null;
    const cleanTarget = cleanPlate(targetPlate);

    return (activeTickets || []).find((ticket) => {
      if (ticket.status === 'CANCELLED' || ticket.status === 'COMPLETED' || ticket.status === 'MISSED' || ticket.status === 'NO_SHOW') return false;
      if (activeReschedule && ticket.id === activeReschedule.id) return false;
      const ticketPlate = ticket.motorcycles?.plate_number
        ? cleanPlate(ticket.motorcycles.plate_number)
        : '';
      const ticketDate = ticket.dropoff_date || '';

      // Block if same plate on the same date (regardless of service type!), OR if motorcycle is currently in progress
      return (
        (ticketPlate === cleanTarget && ticketDate === dropoffDate) ||
        (ticketPlate === cleanTarget && (ticket.status === 'IN_PROGRESS' || ticket.status === 'READY_FOR_PICKUP'))
      );
    });
  }, [activeTicketForSelectedBike, bikeMode, selectedBikeId, motorcycles, newBikePlate, activeTickets, dropoffDate, activeReschedule]);

  // Selected package details (null when nothing is chosen yet)
  const selectedPackage = useMemo(() => {
    if (!serviceType) return null;
    return MOTORCYCLE_SERVICE_PACKAGES.find((p) => p.id === serviceType) || null;
  }, [serviceType]);

  // Filtered packages based on active category
  const filteredPackages = useMemo(() => {
    if (selectedCategory === 'all') return MOTORCYCLE_SERVICE_PACKAGES;
    return MOTORCYCLE_SERVICE_PACKAGES.filter((pkg) => pkg.category === selectedCategory);
  }, [selectedCategory]);

  // Monthly Calendar Matrix Generation
  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: Array<{
      empty: boolean;
      key: string;
      dayNum?: number;
      dateKey?: string;
      isPast?: boolean;
      isToday?: boolean;
      capacity?: ReturnType<typeof getBayCapacity>;
    }> = [];

    // Preceding empty cells
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ empty: true, key: `empty-${i}` });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dObj = new Date(year, month, day);
      dObj.setHours(0, 0, 0, 0);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isPast = dObj < today;
      const isToday = dObj.getTime() === today.getTime();

      // Retrieve capacity from real active bookings + mock schedule
      const baseCap = getBayCapacity(dateKey);
      const realBookingsOnDate = (activeTickets || []).filter(
        (t) => t.dropoff_date === dateKey && t.status !== 'CANCELLED' && t.status !== 'MISSED' && t.status !== 'NO_SHOW'
      ).length;
      const totalOccupied = Math.min(DAILY_MAX_CAPACITY, Math.max(baseCap.occupiedCount, realBookingsOnDate));
      const remainingSlots = Math.max(0, DAILY_MAX_CAPACITY - totalOccupied);
      const status: 'AVAILABLE' | 'LIMITED' | 'FULL' =
        remainingSlots === 0 ? 'FULL' : remainingSlots <= 2 ? 'LIMITED' : 'AVAILABLE';

      cells.push({
        empty: false,
        key: dateKey,
        dayNum: day,
        dateKey,
        isPast,
        isToday,
        capacity: {
          ...baseCap,
          occupiedCount: totalOccupied,
          remainingSlots,
          status,
        },
      });
    }

    return {
      monthLabel: calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      cells,
    };
  }, [calendarMonth, activeTickets]);

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return (
      calendarMonth.getFullYear() === now.getFullYear() &&
      calendarMonth.getMonth() === now.getMonth()
    );
  }, [calendarMonth]);

  const handlePrevMonth = () => {
    if (isCurrentMonth) return;
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCalendarMonth(today);
  };

  // Live capacity calculation for 10 daily slots limit
  const currentCapacity = useMemo(() => {
    if (!dropoffDate) {
      return {
        date: '',
        occupiedCount: 0,
        totalSlots: DAILY_MAX_CAPACITY,
        remainingSlots: DAILY_MAX_CAPACITY,
        status: 'UNSELECTED' as const,
      };
    }
    const baseCap = getBayCapacity(dropoffDate);
    const realBookingsOnDate = (activeTickets || []).filter(
      (t) => t.dropoff_date === dropoffDate && t.status !== 'CANCELLED' && t.status !== 'MISSED' && t.status !== 'NO_SHOW'
    ).length;

    const totalOccupied = Math.min(DAILY_MAX_CAPACITY, Math.max(baseCap.occupiedCount, realBookingsOnDate));
    const remaining = Math.max(0, DAILY_MAX_CAPACITY - totalOccupied);
    const status = remaining === 0 ? 'FULL' : remaining <= 2 ? 'LIMITED' : 'AVAILABLE';

    return {
      date: dropoffDate,
      occupiedCount: totalOccupied,
      totalSlots: DAILY_MAX_CAPACITY,
      remainingSlots: remaining,
      status,
    };
  }, [dropoffDate, activeTickets]);

  const isDateFullyBooked = dropoffDate ? currentCapacity.status === 'FULL' : false;

  // Autocomplete bikes list
  const filteredBikes = useMemo(() => {
    if (!newBikeModel.trim()) return catalog.slice(0, 8);
    const query = newBikeModel.toLowerCase();
    return catalog
      .filter((b) => b.name.toLowerCase().includes(query) || b.brand.toLowerCase().includes(query))
      .slice(0, 10);
  }, [catalog, newBikeModel]);

  const selectedExistingBike = useMemo(() => {
    return motorcycles.find((b) => b.id === selectedBikeId) || motorcycles[0];
  }, [motorcycles, selectedBikeId]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!serviceType) {
        setErrorMsg('Please select a service package to continue.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (bikeMode === 'new' && (!newBikeModel.trim() || !newBikePlate.trim())) {
        setErrorMsg('Please enter both your motorcycle model and plate number.');
        return;
      }
      if (activeTicketForSelectedBike) {
        setErrorMsg(
          `This motorcycle already has active Ticket #${activeTicketForSelectedBike.ticket_code} (${activeTicketForSelectedBike.service_type}). A motorcycle can only have one active service ticket at a time.`
        );
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!dropoffDate) {
        setErrorMsg('Please select an available booking date from the monthly calendar.');
        return;
      }
      if (isDateFullyBooked) {
        setErrorMsg('Please select an available date. This date has reached its maximum 10 booking capacity.');
        return;
      }
      if (!selectedTimeWindow) {
        setErrorMsg('Please select your preferred arrival time window.');
        return;
      }
      if (activeDuplicate) {
        setErrorMsg(
          `Active booking detected for this motorcycle (Ticket #${activeDuplicate.ticket_code}). Cannot create duplicate reservations.`
        );
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userId) {
      setErrorMsg('Please log in to finalize your service reservation.');
      return;
    }

    if (isDateFullyBooked) {
      setErrorMsg(`This date (${dropoffDate}) is fully booked. Please select another date.`);
      return;
    }

    if (activeReschedule) {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await rescheduleServiceTicket({
          ticketId: activeReschedule.id,
          ticketCode: activeReschedule.ticket_code,
          newDropoffDate: dropoffDate,
          newTimeWindow: selectedTimeWindow,
          customNotes: notes.trim() || undefined,
          userId: userId || undefined,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to reschedule reservation.');
        }

        setActiveReschedule(null);
        await onBookingComplete();
        return;
      } catch (err: unknown) {
        console.error('Error rescheduling ticket:', err);
        setErrorMsg(err instanceof Error ? err.message : 'Failed to reschedule reservation.');
        setLoading(false);
        return;
      }
    }

    if (activeDuplicate || activeTicketForSelectedBike) {
      const conflictTicket = activeDuplicate || activeTicketForSelectedBike;
      setErrorMsg(
        `Active booking detected. Ticket #${conflictTicket?.ticket_code} (${conflictTicket?.service_type}) is already open for this motorcycle.`
      );
      return;
    }

    let targetMotorcycleId = selectedBikeId;

    if (bikeMode === 'new' || motorcycles.length === 0) {
      if (!newBikeModel.trim() || !newBikePlate.trim()) {
        setErrorMsg('Please enter both your motorcycle model and plate number.');
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const inputClean = cleanPlate(newBikePlate);
        const localMatch = motorcycles.find((b) => cleanPlate(b.plate_number) === inputClean);

        if (localMatch) {
          targetMotorcycleId = localMatch.id;
          setSelectedBikeId(localMatch.id);
        } else {
          const { data: createdBike, error: bikeError } = await supabase
            .from('motorcycles')
            .insert({
              user_id: userId,
              model: newBikeModel.trim(),
              plate_number: newBikePlate.trim().toUpperCase(),
              year_model: '2024',
              odometer: '0 km',
              status: 'Active',
              next_service: 'Due in 3,000 km',
            })
            .select()
            .single();

          if (bikeError) throw bikeError;
          targetMotorcycleId = createdBike.id;
          setSelectedBikeId(createdBike.id);
        }

        if (newBikeModel.trim()) {
          await registerNewMotorcycleModel(newBikeModel.trim());
        }
      } catch (err: unknown) {
        console.error('Error registering motorcycle:', err);
        setErrorMsg(err instanceof Error ? err.message : 'Failed to register motorcycle.');
        setLoading(false);
        return;
      }
    }

    if (!targetMotorcycleId) {
      setErrorMsg('Please select a valid motorcycle.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      let customerName = userProfile?.full_name?.trim() || '';
      let customerPhone = userProfile?.phone_number?.trim() || '';

      if (!customerName || !customerPhone || customerPhone === 'N/A') {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, phone_number')
            .eq('id', userId)
            .maybeSingle();
          if (prof) {
            if (!customerName && prof.full_name) customerName = prof.full_name;
            if ((!customerPhone || customerPhone === 'N/A') && prof.phone_number) customerPhone = prof.phone_number;
          }
        } catch {
          // ignore
        }
      }

      const customerPrefix = [
        customerName ? `Customer: ${customerName}` : '',
        customerPhone && customerPhone !== 'N/A' ? `Contact: ${customerPhone}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const combinedNotes = [
        customerPrefix,
        selectedSymptoms.length > 0 ? `Reported Symptoms: ${selectedSymptoms.join(', ')}` : '',
        notes.trim() ? `Instructions: ${notes.trim()}` : '',
        `Arrival Window: ${selectedTimeWindow}`,
      ]
        .filter(Boolean)
        .join(' | ');

      const randomCode = `MC-${Math.floor(1000 + Math.random() * 9000)}`;

      const { error: ticketError } = await supabase.from('service_tickets').insert({
        user_id: userId,
        motorcycle_id: targetMotorcycleId,
        ticket_code: randomCode,
        service_type: serviceType,
        stage: 1,
        assigned_bay: 'Bay Assignment Pending',
        assigned_mechanic: 'Queued for Assignment',
        estimated_pickup: 'To be assessed upon arrival',
        total_estimate: selectedPackage?.estimatedCost || 'Quoted on Inspection',
        status: 'IN_PROGRESS',
        dropoff_date: dropoffDate,
        notes: combinedNotes || null,
      });

      if (ticketError) throw ticketError;

      // Broadcast real-time new booking to Admin and Staff consoles live
      if (typeof window !== 'undefined') {
        try {
          supabase.channel('motocare_dispatch_realtime').send({
            type: 'broadcast',
            event: 'TICKET_DISPATCH_SYNC',
            payload: { action: 'NEW_BOOKING', ticket_code: randomCode },
          });
        } catch {
          // ignore
        }
      }

      // Reset
      setNewBikeModel('');
      setNewBikePlate('');
      setNotes('');
      setSelectedSymptoms([]);
      await onBookingComplete();
    } catch (err: unknown) {
      console.error('Booking submission error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit service booking.');
    } finally {
      setLoading(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Service Package' },
    { num: 2, title: 'Vehicle & Notes' },
    { num: 3, title: 'Schedule & Time' },
    { num: 4, title: 'Review & Confirm' },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Reschedule Active Banner */}
      {activeReschedule && (
        <div className="bg-gradient-to-r from-orange-50 via-amber-50/50 to-white border border-orange-200/90 rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CalendarSync className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-orange-950 uppercase tracking-wider">
                  Rescheduling Mode Active
                </span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200/60">
                  Ticket #{activeReschedule.ticket_code}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                {activeReschedule.motorcycles?.model || 'Motorcycle'} ({activeReschedule.motorcycles?.plate_number || 'N/A'}) • {activeReschedule.service_type}. Pumili ng bagong petsa sa calendar at time slot window.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveReschedule(null);
              onCancelReschedule?.();
              setCurrentStep(1);
            }}
            className="w-full sm:w-auto shrink-0 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-full text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            Cancel Reschedule
          </button>
        </div>
      )}

      {/* SERVICE BOOKING STEPPER NAVIGATION BAR (Responsive Mobile & Desktop) */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-4 sm:p-5 shadow-xs">
        {/* Mobile Stepper (< sm) */}
        <div className="sm:hidden space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">
                Step {currentStep} of 4
              </span>
              <span className="text-xs font-bold text-slate-900 block">
                {stepsList[currentStep - 1].title}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {stepsList.map((st) => {
                const isPast = st.num < currentStep;
                const isCurrent = st.num === currentStep;
                return (
                  <button
                    key={st.num}
                    type="button"
                    disabled={st.num > currentStep}
                    onClick={() => {
                      if (isPast) {
                        setErrorMsg(null);
                        setCurrentStep(st.num as 1 | 2 | 3 | 4);
                      }
                    }}
                    className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-orange-500 text-white shadow-xs scale-105'
                        : isPast
                        ? 'bg-emerald-500 text-white cursor-pointer active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : st.num}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-orange-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop Stepper (>= sm) */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-2.5">
          {stepsList.map((step) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;

            return (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  if (step.num < currentStep) {
                    setErrorMsg(null);
                    setCurrentStep(step.num as 1 | 2 | 3 | 4);
                  }
                }}
                disabled={step.num > currentStep}
                className={`flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition-all ${
                  isCurrent
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : isCompleted
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer border border-emerald-200'
                    : 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200/60'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-white text-orange-600'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.num}
                </div>
                <div className="truncate">
                  <span
                    className={`text-[10px] uppercase font-bold block tracking-wider ${
                      isCurrent ? 'text-orange-100' : 'text-slate-400'
                    }`}
                  >
                    Step {step.num}
                  </span>
                  <span className="text-xs font-bold truncate block">{step.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ERROR NOTICE */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block">Notice</strong>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: CHOOSE MOTORCYCLE SERVICE PACKAGE                                  */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-4 pb-16 sm:pb-8">
          <div id="tour-booking-packages" className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 shadow-xs space-y-4">
            {/* Header Title & Subtitle */}
            <div className="pb-3 sm:pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                Select Motorcycle Service
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Choose a service package below, or select our diagnostic assessment if you are unsure of the problem.
              </p>
            </div>

            {/* Category Navigation Bar (Mobile-first, horizontally scrollable on mobile, wraps cleanly on larger screens) */}
            <div className="pt-0.5">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar sm:flex-wrap -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
                {SERVICE_CATEGORIES.map((cat) => {
                  const isCatActive = selectedCategory === cat.id;
                  const count =
                    cat.id === 'all'
                      ? MOTORCYCLE_SERVICE_PACKAGES.length
                      : MOTORCYCLE_SERVICE_PACKAGES.filter((p) => p.category === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-2 sm:py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 sm:gap-2 active:scale-95 ${
                        isCatActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : cat.id === 'diagnostic'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90'
                          : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      {cat.id === 'diagnostic' && (
                        <HelpCircle
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isCatActive ? 'text-amber-300' : 'text-amber-600'
                          }`}
                        />
                      )}
                      <span>{cat.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                          isCatActive
                            ? 'bg-white/20 text-white'
                            : cat.id === 'diagnostic'
                            ? 'bg-amber-200/80 text-amber-950'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 pt-1">
              {filteredPackages.map((pkg) => {
                const isSelected = serviceType === pkg.id;
                const isExpanded = expandedPackageId === pkg.id;
                const Icon = pkg.icon;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      setServiceType(pkg.id);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className={`p-3.5 sm:p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? pkg.isDiagnostic
                          ? 'border-amber-500 bg-amber-50/20 shadow-xs ring-2 ring-amber-500/20'
                          : 'border-orange-500 bg-orange-50/30 shadow-xs ring-2 ring-orange-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Header Row (Mobile-responsive with title wrap and pinned radio) */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected
                                ? pkg.isDiagnostic
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-orange-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <h3 className="font-bold text-sm text-slate-900 leading-snug">
                              {pkg.title}
                            </h3>

                            {/* Category Tag Badge */}
                            {pkg.tag && (
                              <div className="pt-0.5">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block ${
                                    pkg.isDiagnostic
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {pkg.tag}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Radio Selector */}
                        <div className="flex items-center shrink-0 mt-0.5">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? pkg.isDiagnostic
                                  ? 'border-amber-500 bg-amber-500 text-white'
                                  : 'border-orange-500 bg-orange-500 text-white'
                                : 'border-slate-300 bg-white hover:border-slate-400'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </div>
                        </div>
                      </div>

                      {/* --- MOBILE ACCORDION (md:hidden) --- */}
                      <div className="md:hidden pt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPackageId(isExpanded ? null : pkg.id);
                          }}
                          className="text-[11px] font-semibold text-slate-600 hover:text-orange-600 flex items-center gap-1 cursor-pointer py-1 bg-slate-50 hover:bg-slate-100 px-2.5 rounded-lg border border-slate-200/80 transition"
                        >
                          <span>{isExpanded ? 'Hide service details' : 'View service inclusions'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="space-y-2.5 pt-2.5 border-t border-slate-100 mt-2 animate-in fade-in duration-150">
                            <p className="text-xs text-slate-500 leading-relaxed">{pkg.description}</p>

                            <div className="space-y-1 text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                Included Services & Checks
                              </span>
                              {pkg.inclusions.map((inc, i) => (
                                <div key={i} className="flex items-start gap-2 text-slate-600 text-[11px] leading-tight">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{inc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* --- DESKTOP VIEW (Always visible on md: and above) --- */}
                      <div className="hidden md:block space-y-3">
                        <p className="text-xs text-slate-500 leading-relaxed">{pkg.description}</p>

                        <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Included Services & Checks
                          </span>
                          {pkg.inclusions.map((inc, i) => (
                            <div key={i} className="flex items-center gap-2 text-slate-600 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{inc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Diagnostic Assessment Reassurance Notice (clean 2-line box when Diagnostic is selected) */}
                      {pkg.isDiagnostic && isSelected && (
                        <div className="mt-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
                          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-amber-950 text-[11px] leading-relaxed">
                            <strong className="font-bold block text-amber-950 mb-0.5">
                              Senior Mechanic Diagnostic Assessment
                            </strong>
                            Our technicians will perform a comprehensive physical and computer inspection upon arrival. You can specify observed symptoms in Step 2.
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  );
                })}
              </div>

            {/* Step 1 Footer Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-5 sm:pt-6 mt-4 sm:mt-6 border-t border-slate-100 gap-3 sm:pr-36">
              <div className="text-xs text-slate-500 text-center sm:text-left">
                {selectedPackage ? (
                  <>
                    Selected: <strong className="text-slate-900">{selectedPackage.title}</strong>
                  </>
                ) : (
                  <span className="text-slate-400 font-medium">
                    Please tap a service package above to select
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={!serviceType}
                onClick={handleNextStep}
                className={`w-full sm:w-auto font-semibold text-xs py-2.5 px-6 rounded-full flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  serviceType
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20 active:scale-95'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80'
                }`}
              >
                <span>{serviceType ? 'Continue to Vehicle Details' : 'Choose a Service Package'}</span>
                {serviceType && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: VEHICLE & SPECIAL REQUESTS (GUEST DETAILS STYLE)                   */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  Vehicle Information & Special Requests
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Confirm the motorcycle receiving service and report any symptoms to the mechanics.
                </p>
              </div>

              {motorcycles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBikeMode(bikeMode === 'existing' ? 'new' : 'existing');
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-3.5 py-1.5 rounded-full transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  {bikeMode === 'existing' ? (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Book a different motorcycle</span>
                    </>
                  ) : (
                    <>
                      <Bike className="w-3.5 h-3.5" />
                      <span>Choose saved vehicle ({motorcycles.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Motorcycle Selector */}
            {bikeMode === 'existing' && motorcycles.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {motorcycles.map((bike) => {
                    const isSelected = selectedBikeId === bike.id;
                    const bikeActiveTicket = getActiveTicketForBike(bike.id) || getActiveTicketForBike(bike.plate_number);
                    const isBikeActive = Boolean(bikeActiveTicket);

                    return (
                      <div
                        key={bike.id}
                        onClick={() => setSelectedBikeId(bike.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? isBikeActive
                              ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-xs'
                              : 'border-orange-500 bg-orange-50/30 ring-2 ring-orange-500/20 shadow-xs'
                            : isBikeActive
                            ? 'border-amber-200/80 bg-amber-50/20 hover:border-amber-300'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? isBikeActive
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-orange-500 text-white shadow-xs'
                                : isBikeActive
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Bike className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-xs text-slate-900 truncate">{bike.model}</p>
                              {isBikeActive ? (
                                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                                  In Workshop
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                  Available
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold">{bike.plate_number}</p>
                          </div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                            isSelected
                              ? isBikeActive
                                ? 'border-amber-500 bg-amber-500 text-white'
                                : 'border-orange-500 bg-orange-500 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Ticket Alert Card for Selected Motorcycle */}
                {activeTicketForSelectedBike && (
                  <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-xs">
                        <strong className="font-bold text-amber-950 block">
                          Motorcycle Currently in Workshop (Ticket #{activeTicketForSelectedBike.ticket_code})
                        </strong>
                        <p className="text-amber-800 leading-relaxed">
                          This vehicle is actively being serviced for <strong>{activeTicketForSelectedBike.service_type}</strong> (Stage {activeTicketForSelectedBike.stage}). A motorcycle cannot have concurrent bookings until the current ticket is completed.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/60">
                      {onRequestCancelTicket && activeTicketForSelectedBike.stage === 1 && (
                        <button
                          type="button"
                          onClick={() => onRequestCancelTicket(activeTicketForSelectedBike)}
                          className="flex-1 sm:flex-initial px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Cancel Booking</span>
                        </button>
                      )}
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('overview')}
                          className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Track Repair</span>
                        </button>
                      )}
                      {onOpenChat && (
                        <button
                          type="button"
                          onClick={onOpenChat}
                          className="flex-1 sm:flex-initial px-3 py-1.5 rounded-full bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                          <span>Chat Shop</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Inline new bike registration */
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="text-[11px] text-slate-500 font-medium">
                  Registering a new motorcycle. It will be saved automatically to your garage:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 relative" ref={dropdownRef}>
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Motorcycle Model *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={newBikeModel}
                        onChange={(e) => {
                          setNewBikeModel(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="e.g. Honda Click 125i, Yamaha NMAX..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pr-7 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {isDropdownOpen && filteredBikes.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {filteredBikes.map((bike, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setNewBikeModel(bike.name);
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-800">{bike.name}</span>
                            <span className="text-[10px] text-slate-400">{bike.brand}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Plate / MV File Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBikePlate}
                      onChange={(e) => setNewBikePlate(e.target.value.toUpperCase())}
                      placeholder="e.g. ND 45821 / TEMP"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 uppercase text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-semibold"
                    />
                  </div>
                </div>

                {/* Real-time alert if typed plate already has an active ticket */}
                {activeTicketForSelectedBike && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Plate <strong>{newBikePlate}</strong> already has open Ticket #{activeTicketForSelectedBike.ticket_code} ({activeTicketForSelectedBike.service_type}).
                      </span>
                    </div>
                    {onRequestCancelTicket && activeTicketForSelectedBike.stage === 1 && (
                      <button
                        type="button"
                        onClick={() => onRequestCancelTicket(activeTicketForSelectedBike)}
                        className="px-3 py-1 rounded-full bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 shrink-0 self-start sm:self-auto"
                      >
                        <XCircle className="w-3 h-3 text-rose-500" />
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Special Request Checklist (Quick Symptoms) */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-800 block">
                Quick Symptoms / Special Focus Check (Optional)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMMON_SYMPTOMS.map((symptom, idx) => {
                  const isChecked = selectedSymptoms.includes(symptom);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center gap-2.5 cursor-pointer ${
                        isChecked
                          ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-semibold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <span>{symptom}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Additional Instructions for the Mechanic (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any other specific requests, parts to check, or timeline preferences..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500 transition resize-none leading-relaxed"
              />
            </div>

            {/* Step 2 Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-3 sm:pr-36">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-full sm:w-auto text-slate-600 hover:text-slate-900 font-semibold text-xs py-2.5 px-4 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Packages</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                disabled={Boolean(activeTicketForSelectedBike)}
                className={`w-full sm:w-auto font-semibold text-xs py-2.5 px-6 rounded-full flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTicketForSelectedBike
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed opacity-90'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20'
                }`}
              >
                <span>
                  {activeTicketForSelectedBike ? 'Vehicle Has Active Ticket' : 'Continue to Schedule'}
                </span>
                {!activeTicketForSelectedBike && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: DATE & ARRIVAL WINDOW                                             */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            {/* Header / Intro */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  Select Drop-off Date & Arrival Window
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Pick an available day from the monthly calendar, then choose your arrival time window.
                </p>
              </div>

              {dropoffDate && (
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto flex items-center gap-1.5 ${
                    currentCapacity.status === 'FULL'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : currentCapacity.status === 'LIMITED'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      currentCapacity.status === 'FULL'
                        ? 'bg-rose-600'
                        : currentCapacity.status === 'LIMITED'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-emerald-500'
                    }`}
                  />
                  {currentCapacity.status === 'FULL'
                    ? 'Fully Booked for Selected Date'
                    : currentCapacity.status === 'LIMITED'
                    ? `High Demand: ${currentCapacity.remainingSlots} slots remaining`
                    : `${currentCapacity.remainingSlots} of 10 slots available`}
                </span>
              )}
            </div>

            {/* STEP 1: MONTHLY CALENDAR GRID VIEW */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">
                    Step 1: Choose Workshop Date
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Monthly bay availability schedule (Closed on past dates & fully-booked days)
                  </p>
                </div>

                {/* Month Navigator Controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {!isCurrentMonth && (
                    <button
                      type="button"
                      onClick={handleJumpToToday}
                      className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 sm:px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      Today
                    </button>
                  )}
                  <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      disabled={isCurrentMonth}
                      onClick={handlePrevMonth}
                      className="p-1.5 sm:px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2.5 sm:px-3 text-xs font-bold text-slate-800 whitespace-nowrap min-w-[110px] text-center select-none">
                      {calendarData.monthLabel}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 sm:px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 7-Day Matrix */}
              <div className="border border-slate-200 rounded-2xl bg-white p-2.5 sm:p-4 shadow-2xs space-y-2">
                {/* Weekday Names Header */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>

                {/* Day Grid Cells */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarData.cells.map((cell) => {
                    if (cell.empty) {
                      return <div key={cell.key} className="h-14 sm:h-16 rounded-xl bg-transparent" />;
                    }

                    const { dayNum, dateKey, isPast, isToday, capacity } = cell;
                    const isSelected = dropoffDate === dateKey;
                    const isFull = capacity?.status === 'FULL';
                    const isLimited = capacity?.status === 'LIMITED';
                    const isDisabled = isPast || isFull;

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (!isDisabled && dateKey) {
                            setDropoffDate(dateKey);
                            if (errorMsg) setErrorMsg(null);
                          }
                        }}
                        className={`relative h-14 sm:h-16 rounded-xl p-1 sm:p-1.5 flex flex-col justify-between items-center text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/25 ring-2 ring-orange-500 ring-offset-2 z-10'
                            : isDisabled
                            ? isPast
                              ? 'bg-slate-50/60 border border-slate-100 text-slate-300 cursor-not-allowed opacity-40'
                              : 'bg-rose-50/40 border border-rose-200/60 text-rose-800 cursor-not-allowed opacity-80'
                            : isLimited
                            ? 'bg-amber-50/50 hover:bg-amber-100/60 border border-amber-200 text-slate-800 hover:scale-[1.02]'
                            : 'bg-white hover:bg-orange-50/25 border border-slate-200 hover:border-orange-300 text-slate-800 hover:scale-[1.02]'
                        }`}
                      >
                        <div className="w-full flex items-center justify-between text-[11px] sm:text-xs">
                          <span className={`font-semibold ${isSelected ? 'text-white' : isToday ? 'text-orange-600 font-bold' : ''}`}>
                            {dayNum}
                          </span>
                          {isToday && !isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Today" />
                          )}
                        </div>

                        {/* Status Label */}
                        <div className="w-full">
                          {isPast ? (
                            <span className="text-[9px] text-slate-300">--</span>
                          ) : isFull ? (
                            <span
                              className={`text-[8.5px] sm:text-[9.5px] font-bold px-1 py-0.5 rounded block uppercase leading-none ${
                                isSelected ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              Full
                            </span>
                          ) : isLimited ? (
                            <span
                              className={`text-[8.5px] sm:text-[9.5px] font-bold px-1 py-0.5 rounded block leading-none ${
                                isSelected ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {capacity?.remainingSlots} left
                            </span>
                          ) : (
                            <span
                              className={`text-[8.5px] sm:text-[9.5px] font-bold px-1 py-0.5 rounded block leading-none ${
                                isSelected ? 'bg-white/25 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              }`}
                            >
                              Open
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Open (3-10 Slots)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Limited (1-2 Left)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Full (0 Slots)</span>
                    </span>
                  </div>
                  <span className="text-slate-400">Past dates closed</span>
                </div>
              </div>
            </div>

            {/* STEP 2: TIME SLOT SELECTION (CONDITIONAL) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Step 2: Preferred Arrival Window (Drop-off Time)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {dropoffDate
                      ? 'Select your arrival window for technician hand-over.'
                      : 'Locked: Please pick an available date above to unlock arrival windows.'}
                  </p>
                </div>
              </div>

              {!dropoffDate ? (
                <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 flex items-center gap-3 animate-in fade-in">
                  <div className="w-9 h-9 rounded-full bg-slate-200/90 text-slate-500 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Time Slots Locked</h4>
                    <p className="text-[11px] text-slate-500">
                      Please select an available date on the calendar above to activate and choose your drop-off window.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-900">
                      Selected Date:{' '}
                      {new Date(dropoffDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-orange-700 bg-white/90 px-2.5 py-0.5 rounded-full border border-orange-200 self-start sm:self-auto">
                    {currentCapacity.remainingSlots} of 10 Slots Available
                  </span>
                </div>
              )}

              {/* Time Window Cards */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-3 gap-3 transition-all duration-200 ${
                  !dropoffDate ? 'opacity-30 pointer-events-none select-none' : 'opacity-100'
                }`}
              >
                {TIME_WINDOWS.map((w) => {
                  const isSelected = selectedTimeWindow === w.id;
                  return (
                    <div
                      key={w.id}
                      onClick={() => {
                        if (dropoffDate) setSelectedTimeWindow(w.id);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected && dropoffDate
                          ? 'border-orange-500 bg-orange-50/30 ring-2 ring-orange-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{w.label}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected && dropoffDate
                              ? 'border-orange-500 bg-orange-500 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && dropoffDate && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      <p className="text-xs text-orange-600 font-semibold">{w.time}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{w.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3 Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-3 sm:pr-36">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full sm:w-auto text-slate-600 hover:text-slate-900 font-semibold text-xs py-2.5 px-4 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Vehicle Details</span>
              </button>

              <button
                type="button"
                disabled={!dropoffDate || isDateFullyBooked}
                onClick={handleNextStep}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs py-2.5 px-6 rounded-full flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Proceed to Review Booking</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: REVIEW & CONFIRM BOOKING                                          */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">
                Final Step • Transparent Summary
              </span>
              <h2 className="text-base font-bold text-slate-900 leading-snug mt-0.5">
                Review Your Reservation
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Please verify your appointment details below. You will only pay upon vehicle completion.
              </p>
            </div>

            {/* Transparent Booking Details Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Vehicle
                </span>
                <strong className="text-sm font-bold text-slate-900 block mt-1">
                  {bikeMode === 'existing' && selectedExistingBike
                    ? selectedExistingBike.model
                    : newBikeModel || 'Pending'}
                </strong>
                <span className="text-xs text-slate-600 font-semibold block mt-0.5">
                  {bikeMode === 'existing' && selectedExistingBike
                    ? selectedExistingBike.plate_number
                    : newBikePlate || 'NO PLATE'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Scheduled Drop-off
                </span>
                <strong className="text-sm font-bold text-slate-900 block mt-1">
                  {dropoffDate
                    ? new Date(dropoffDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Date Pending'}
                </strong>
                <span className="text-xs text-orange-600 font-semibold block mt-0.5">
                  {selectedTimeWindow}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Workshop Intake Priority
                </span>
                <strong className="text-sm font-bold text-slate-900 block mt-1">
                  Same-Day Bay Priority
                </strong>
                <span className="text-xs text-emerald-600 font-semibold block mt-0.5">
                  Slot #{currentCapacity.occupiedCount + 1} of 10 Confirmed
                </span>
              </div>
            </div>

            {/* Clean Appointment Summary & Workshop Receipt Policy */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5">
              <span className="text-xs font-bold text-slate-900 block">
                Appointment Summary
              </span>

              <div className="space-y-2.5 text-xs divide-y divide-slate-200/70">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600 font-medium">Selected Service</span>
                  <span className="font-bold text-slate-900">{selectedPackage?.title || 'Selected Service'}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-600">Time Slot Window</span>
                  <span className="font-semibold text-slate-800">{selectedTimeWindow}</span>
                </div>
                <div className="pt-3">
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                    <FileText className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-slate-600 leading-relaxed">
                      <strong className="text-slate-900 font-bold block mb-0.5">
                        Workshop Payment & Official Receipt Policy
                      </strong>
                      This is an appointment booking for workshop bay scheduling. Final charges will be computed at the shop counter upon inspection and parts approval. Payment (Cash or GCash) and your official itemized receipt will be provided upon vehicle release at the workshop.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Consumer Protection / Guarantees Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-3 rounded-2xl border border-slate-200 bg-white flex items-start gap-2.5">
                <CreditCard className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 font-semibold">Zero Advance Payment</strong>
                  <span className="text-slate-500 text-[11px]">Pay via Cash or GCash upon vehicle release.</span>
                </div>
              </div>
              <div className="p-3 rounded-2xl border border-slate-200 bg-white flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 font-semibold">Service Warranty</strong>
                  <span className="text-slate-500 text-[11px]">7-day workshop guarantee on all repairs.</span>
                </div>
              </div>
              <div className="p-3 rounded-2xl border border-slate-200 bg-white flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 font-semibold">Official Receipt on Release</strong>
                  <span className="text-slate-500 text-[11px]">Itemized receipt provided at shop counter.</span>
                </div>
              </div>
            </div>

            {/* Step 4 Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-3 sm:pr-36">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="w-full sm:w-auto text-slate-600 hover:text-slate-900 font-semibold text-xs py-2.5 px-4 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Schedule</span>
              </button>

              <button
                type="button"
                disabled={loading || isDateFullyBooked || Boolean(activeDuplicate)}
                onClick={() => handleSubmit()}
                className={`w-full sm:w-auto font-semibold text-xs py-3 px-8 rounded-full transition flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                  activeDuplicate
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed'
                    : isDateFullyBooked
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirming reservation...</span>
                  </>
                ) : activeDuplicate ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <span>Active Booking Exists for this Bike</span>
                  </>
                ) : (
                  <>
                    {activeReschedule ? <CalendarSync className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    <span>{activeReschedule ? 'Confirm Rescheduled Appointment' : 'Confirm Reservation'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
