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
  Clock,
  Droplets,
  Settings,
  Activity,
  Disc,
  Zap,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Check,
  ShieldCheck,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import { TabType } from '../../types/dashboard';
import { getBayCapacity, getMockReservationsSchedule, DAILY_MAX_CAPACITY } from '../../utils/mockReservations';
import {
  getCompleteMotorcycleCatalog,
  registerNewMotorcycleModel
} from '../../utils/motorcycleCatalog';

interface BookServiceTabProps {
  userId: string | null;
  motorcycles: Motorcycle[];
  selectedBikeId: string;
  setSelectedBikeId: (id: string) => void;
  activeTickets?: ServiceTicket[];
  serviceHistory?: ServiceTicket[];
  onBookingComplete: () => Promise<void>;
  onNavigateTab?: (tab: TabType) => void;
  onOpenChat?: () => void;
}

interface ServicePackageOption {
  id: string;
  title: string;
  category: string;
  tag?: string;
  estimatedCost: string;
  basePriceNum: number;
  estimatedDuration: string;
  description: string;
  inclusions: string[];
  icon: typeof Wrench;
}

const HOTEL_STYLE_PACKAGES: ServicePackageOption[] = [
  {
    id: 'Change Oil & Routine Inspection',
    title: 'Standard Oil & Safety Care',
    category: 'Essential Maintenance',
    tag: 'Popular',
    estimatedCost: '₱450.00',
    basePriceNum: 450,
    estimatedDuration: '30 - 45 mins',
    description: 'High-grade 4T/Scooter engine oil refill, filter inspection, and complete safety inspection.',
    inclusions: [
      'Premium synthetic blend oil refill',
      'Magnetic oil drain plug cleaning & new washer',
      'Tire pressure & brake lever free-play check',
      'Free 21-point digital chassis inspection',
    ],
    icon: Droplets,
  },
  {
    id: 'CVT Cleaning, Regrease & Belt Check',
    title: 'CVT Overhaul & Regrease Suite',
    category: 'Scooter Transmission',
    tag: 'Best for Scooters',
    estimatedCost: '₱650.00',
    basePriceNum: 650,
    estimatedDuration: '1 - 1.5 hrs',
    description: 'Restores throttle response and eliminates dragging with high-temperature torque grease.',
    inclusions: [
      'Drive belt micro-crack & width measurement',
      'Variator pulley & roller weight degreasing',
      'Clutch bell & shoe deglazing / sanding',
      'High-temp torque spring regrease application',
    ],
    icon: Settings,
  },
  {
    id: 'FI Diagnostic & Throttle Body Cleaning',
    title: 'FI Throttle Body & Injector Tune',
    category: 'Fuel & Engine Tuning',
    tag: 'Fuel Saver',
    estimatedCost: '₱750.00',
    basePriceNum: 750,
    estimatedDuration: '1 - 1.5 hrs',
    description: 'Complete ultrasonic fuel injector servicing, manifold degrease, and ECU computer scan.',
    inclusions: [
      'Throttle body ultrasonic chamber cleaning',
      'Fuel injector flow pattern calibration',
      'ECU diagnostic scanner & fault code reset',
      'Throttle Position Sensor (TPS) idle reset',
    ],
    icon: Activity,
  },
  {
    id: 'Brake Caliper Overhaul & Fluid Flush',
    title: 'Brake Caliper & Hydraulic Flush',
    category: 'Safety & Braking',
    tag: 'Safety Essential',
    estimatedCost: '₱550.00',
    basePriceNum: 550,
    estimatedDuration: '1 hr',
    description: 'Full hydraulic brake fluid replacement with synthetic DOT 4 and caliper piston service.',
    inclusions: [
      'Synthetic DOT 4 complete hydraulic fluid bleed',
      'Brake caliper piston disassembly & degrease',
      'Rotor run-out and brake pad thickness measurement',
      'Master cylinder pressure test & seal check',
    ],
    icon: Disc,
  },
  {
    id: 'Full PMS & Valve Clearance Check',
    title: 'Master Comprehensive PMS',
    category: 'Complete Overhaul',
    tag: 'Best Value',
    estimatedCost: '₱1,450.00',
    basePriceNum: 1450,
    estimatedDuration: '3 - 4 hrs',
    description: 'Total workshop bumper-to-bumper checkup including precision feeler gauge valve clearance.',
    inclusions: [
      'Precision intake/exhaust valve clearance adjustment',
      'Spark plug electrode gap check & cleaning',
      'Full swingarm, suspension, & chassis bolt torquing',
      'Coolant level inspection & full drivetrain diagnostic',
    ],
    icon: Sparkles,
  },
  {
    id: 'Electrical & Battery Diagnostics',
    title: 'Electrical & Charging Audit',
    category: 'Electrical Systems',
    tag: 'Quick Diagnostic',
    estimatedCost: '₱500.00',
    basePriceNum: 500,
    estimatedDuration: '45 mins - 1 hr',
    description: 'Comprehensive electrical test for starting issues, dead battery, and wiring health.',
    inclusions: [
      'Cold-cranking ampere battery load test',
      'Stator AC output & rectifier charging voltage test',
      'Main fuse box, starter relay, & harness inspection',
      'Ground resistance test to eliminate power leak',
    ],
    icon: Zap,
  },
];

const TIME_WINDOWS = [
  { id: '08:00 AM - 10:00 AM', label: 'Morning Intake', time: '08:00 AM - 10:00 AM', desc: 'Fastest turnaround, early morning priority' },
  { id: '10:00 AM - 01:00 PM', label: 'Midday Intake', time: '10:00 AM - 01:00 PM', desc: 'Convenient afternoon pickup' },
  { id: '01:00 PM - 04:00 PM', label: 'Afternoon Intake', time: '01:00 PM - 04:00 PM', desc: 'Same-day or next-morning collection' },
];

const COMMON_SYMPTOMS = [
  'Hard starting or sluggish battery',
  'Squeaking or noisy brakes',
  'CVT dragging or sluggish acceleration',
  'Engine vibration when accelerating past 40 kph',
  'Unusual engine ticking noise',
  'Fluids leaking (oil or coolant)',
];

export default function BookServiceTab({
  userId,
  motorcycles,
  selectedBikeId,
  setSelectedBikeId,
  activeTickets = [],
  onBookingComplete,
  onNavigateTab,
  onOpenChat,
}: BookServiceTabProps) {
  // Wizard current step: 1 = Service, 2 = Date & Time, 3 = Vehicle, 4 = Review & Confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Selected service package & mobile accordion toggle
  const [serviceType, setServiceType] = useState(HOTEL_STYLE_PACKAGES[0].id);
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);

  // Step 2: Date & arrival window
  const [dropoffDate, setDropoffDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(TIME_WINDOWS[0].id);

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

  // Helper: Find if a motorcycle (by ID or Plate) already has an active ongoing ticket in the workshop
  const getActiveTicketForBike = (bikeIdOrPlate?: string) => {
    if (!bikeIdOrPlate || !bikeIdOrPlate.trim()) return null;
    const clean = cleanPlate(bikeIdOrPlate);
    return (activeTickets || []).find((ticket) => {
      if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') return false;
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
      if (ticket.status === 'CANCELLED' || ticket.status === 'COMPLETED') return false;
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
  }, [activeTicketForSelectedBike, bikeMode, selectedBikeId, motorcycles, newBikePlate, activeTickets, dropoffDate]);

  // Selected package details
  const selectedPackage = useMemo(() => {
    return (
      HOTEL_STYLE_PACKAGES.find((p) => p.id === serviceType) ||
      HOTEL_STYLE_PACKAGES[0]
    );
  }, [serviceType]);

  // 7-day schedule strip with natural availability
  const upcomingSchedule = useMemo(() => Object.values(getMockReservationsSchedule(7)), []);

  // Live capacity calculation for 10 daily slots limit
  const currentCapacity = useMemo(() => {
    const baseCap = getBayCapacity(dropoffDate);
    const realBookingsOnDate = (activeTickets || []).filter(
      (t) => t.dropoff_date === dropoffDate && t.status !== 'CANCELLED'
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

  const isDateFullyBooked = currentCapacity.status === 'FULL';

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
      if (isDateFullyBooked) {
        setErrorMsg('Please select an available date. This date has reached its maximum 10 booking capacity.');
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
      const combinedNotes = [
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
        total_estimate: selectedPackage.estimatedCost,
        status: 'IN_PROGRESS',
        dropoff_date: dropoffDate,
        notes: combinedNotes || null,
      });

      if (ticketError) throw ticketError;

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
      
      {/* HOTEL-STYLE STEPPER NAVIGATION BAR (Responsive Mobile & Desktop) */}
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
              {stepsList.map((st) => (
                <div
                  key={st.num}
                  className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                    st.num === currentStep
                      ? 'bg-orange-500 text-white shadow-xs scale-105'
                      : st.num < currentStep
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {st.num < currentStep ? <Check className="w-3 h-3" /> : st.num}
                </div>
              ))}
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
      {/* STEP 1: CHOOSE SERVICE PACKAGE (HOTEL ROOM SELECTION STYLE)                */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  Select Service Package
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Transparent upfront pricing with zero hidden fees. Pick the service that matches your ride.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                No Deposit Required
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {HOTEL_STYLE_PACKAGES.map((pkg) => {
                const isSelected = serviceType === pkg.id;
                const isExpanded = expandedPackageId === pkg.id;
                const Icon = pkg.icon;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => setServiceType(pkg.id)}
                    className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/30 shadow-xs ring-2 ring-orange-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Header Row (Mobile: Shows Icon, Tag, Title, Price, and Radio; Desktop: Shows Icon, Tag, Title, and Radio) */}
                      <div className="flex items-center sm:items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 ${
                              isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            {pkg.tag && (
                              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 inline-block">
                                {pkg.tag}
                              </span>
                            )}
                            <h3 className="font-bold text-sm text-slate-900 mt-0.5 leading-snug truncate">
                              {pkg.title}
                            </h3>
                          </div>
                        </div>

                        {/* Right: Mobile Price + Radio Selector */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right md:hidden">
                            <span className="text-xs font-bold text-slate-900 block leading-tight">
                              {pkg.estimatedCost}
                            </span>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-orange-500 bg-orange-500 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>

                      {/* --- MOBILE ACCORDION (md:hidden) --- */}
                      <div className="md:hidden">
                        {/* Toggle button row on mobile */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedPackageId(isExpanded ? null : pkg.id);
                            }}
                            className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer py-0.5"
                          >
                            <span>{isExpanded ? 'Hide details' : 'View inclusions & details'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {pkg.estimatedDuration}
                          </span>
                        </div>

                        {/* Collapsible details on mobile */}
                        {isExpanded && (
                          <div className="space-y-3 pt-3 border-t border-slate-100 mt-2.5 animate-in fade-in duration-150">
                            <p className="text-xs text-slate-500 leading-relaxed">{pkg.description}</p>

                            <div className="space-y-1.5 text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Transparent Inclusions
                              </span>
                              {pkg.inclusions.map((inc, i) => (
                                <div key={i} className="flex items-center gap-2 text-slate-600 text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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

                        {/* Transparent Inclusions list */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Transparent Inclusions
                          </span>
                          {pkg.inclusions.map((inc, i) => (
                            <div key={i} className="flex items-center gap-2 text-slate-600 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{inc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Price and turnaround footer (Always visible on md: and above) */}
                    <div className="hidden md:flex pt-3 mt-4 border-t border-slate-100 items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Fixed Package Price
                        </span>
                        <span className="text-base font-bold text-slate-900">
                          {pkg.estimatedCost}
                        </span>
                      </div>

                      <span className="text-xs text-slate-500 flex items-center gap-1 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {pkg.estimatedDuration}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step 1 Footer Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 mt-6 border-t border-slate-100 gap-3">
              <div className="text-xs text-slate-500 text-center sm:text-left">
                Selected: <strong className="text-slate-900">{selectedPackage.title}</strong> (
                {selectedPackage.estimatedCost})
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs py-2.5 px-6 rounded-full flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20 transition cursor-pointer"
              >
                <span>Continue to Vehicle Details</span>
                <ChevronRight className="w-4 h-4" />
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
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Plate <strong>{newBikePlate}</strong> already has open Ticket #{activeTicketForSelectedBike.ticket_code} ({activeTicketForSelectedBike.service_type}).
                    </span>
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
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-3">
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
      {/* STEP 3: DATE & ARRIVAL WINDOW (HOTEL CHECK-IN CALENDAR STYLE)              */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  Select Drop-off Date & Arrival Window
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Daily intake is controlled to ensure every bike gets undivided master technician attention.
                </p>
              </div>

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
                  ? `High Demand: Only ${currentCapacity.remainingSlots} slots remaining`
                  : `${currentCapacity.remainingSlots} of 10 slots available`}
              </span>
            </div>

            {/* 7-Day Quick Strip */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Recommended 7-Day Dates
              </label>
              <div className="overflow-x-auto pb-1.5 -mx-1 px-1 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-7 gap-2">
                {upcomingSchedule.map((day) => {
                  const isSelected = dropoffDate === day.date;
                  const isFull = day.status === 'FULL';
                  const isLimited = day.status === 'LIMITED';

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        setDropoffDate(day.date);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      className={`min-w-[70px] sm:min-w-0 p-2.5 rounded-2xl text-center flex flex-col items-center justify-between border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                          : isFull
                          ? 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100/70'
                          : isLimited
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100/70'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-80">
                        {day.dayLabel.split(' ')[0]}
                      </span>
                      <span className="text-base font-bold my-0.5">
                        {day.date.split('-')[2]}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/25 text-white'
                            : isFull
                            ? 'bg-rose-200/80 text-rose-900'
                            : isLimited
                            ? 'bg-amber-200/80 text-amber-950'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isFull ? 'FULL' : isLimited ? `${day.remainingSlots} left` : 'Open'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Date Picker Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Or Pick a Specific Future Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={dropoffDate}
                onChange={(e) => {
                  setDropoffDate(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500 transition"
              />
            </div>

            {/* Arrival Time Window Selection */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-800 block">
                Preferred Arrival Window (Drop-off Time)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TIME_WINDOWS.map((w) => {
                  const isSelected = selectedTimeWindow === w.id;
                  return (
                    <div
                      key={w.id}
                      onClick={() => setSelectedTimeWindow(w.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/30 ring-2 ring-orange-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{w.label}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
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
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-3">
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
                disabled={isDateFullyBooked}
                onClick={handleNextStep}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs py-2.5 px-6 rounded-full flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
              >
                <span>Review & Confirm</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: REVIEW & CONFIRM (HOTEL CHECKOUT SUMMARY & GUARANTEE STYLE)        */}
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
                  {new Date(dropoffDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </strong>
                <span className="text-xs text-orange-600 font-semibold block mt-0.5">
                  {selectedTimeWindow}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Turnaround Estimate
                </span>
                <strong className="text-sm font-bold text-slate-900 block mt-1">
                  {selectedPackage.estimatedDuration}
                </strong>
                <span className="text-xs text-emerald-600 font-semibold block mt-0.5">
                  Slot #{currentCapacity.occupiedCount + 1} of 10 Confirmed
                </span>
              </div>
            </div>

            {/* Transparent Bill Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-900 block">
                Itemized Estimate Breakdown
              </span>

              <div className="space-y-2 text-xs divide-y divide-slate-200/80">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600">{selectedPackage.title} (Parts & Labor)</span>
                  <span className="font-bold text-slate-900">{selectedPackage.estimatedCost}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    21-Point Digital Safety Diagnostic
                  </span>
                  <span className="font-bold text-emerald-600">FREE (₱0.00)</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Chain Lubrication & Tire Pressure Calibration
                  </span>
                  <span className="font-bold text-emerald-600">FREE (₱0.00)</span>
                </div>
                <div className="flex items-center justify-between pt-3 text-sm">
                  <span className="font-bold text-slate-900">Total Estimated Amount Due</span>
                  <span className="font-bold text-slate-900 text-base">
                    {selectedPackage.estimatedCost}
                  </span>
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
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 font-semibold">Live Bay Tracking</strong>
                  <span className="text-slate-500 text-[11px]">Real-time stage progression on your phone.</span>
                </div>
              </div>
            </div>

            {/* Step 4 Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-3">
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
                    <Calendar className="w-4 h-4" />
                    <span>Confirm Reservation</span>
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
