import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Motorcycle, BikeModel, ServiceTicket } from '../../types/dashboard';
import {
  Calendar,
  AlertCircle,
  Loader2,
  Wrench,
  CheckCircle2,
  ShieldAlert,
  Search,
  Sparkles,
  Plus,
  Clock,
  Droplets,
  Settings,
  Activity,
  Disc,
  Zap,
  Bike,
  Info
} from 'lucide-react';
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
}

interface ServicePackageOption {
  id: string;
  title: string;
  category: string;
  estimatedCost: string;
  estimatedDuration: string;
  description: string;
  icon: typeof Wrench;
}

const SERVICE_PACKAGES: ServicePackageOption[] = [
  {
    id: 'Change Oil & Routine Inspection',
    title: 'Change Oil & Routine Inspection',
    category: 'Essential Maintenance',
    estimatedCost: '₱350 - ₱600',
    estimatedDuration: '30 - 45 mins',
    description: 'Engine oil drain & refill, filter inspection, tire pressure, and brake adjustments.',
    icon: Droplets,
  },
  {
    id: 'CVT Cleaning, Regrease & Belt Check',
    title: 'CVT Cleaning, Regrease & Belt Check',
    category: 'Transmission / Scooter',
    estimatedCost: '₱550 - ₱850',
    estimatedDuration: '1 - 1.5 hrs',
    description: 'Drive belt inspection, pulley degrease, roller weight check, and high-temp torque grease.',
    icon: Settings,
  },
  {
    id: 'FI Diagnostic & Throttle Body Cleaning',
    title: 'FI Diagnostic & Throttle Body Cleaning',
    category: 'Fuel & Engine Tuning',
    estimatedCost: '₱650 - ₱950',
    estimatedDuration: '1 - 1.5 hrs',
    description: 'Intake manifold cleaning, fuel injector ultrasonic test, and ECU fault code scan.',
    icon: Activity,
  },
  {
    id: 'Brake Caliper Overhaul & Fluid Flush',
    title: 'Brake Caliper Overhaul & Fluid Flush',
    category: 'Safety & Braking',
    estimatedCost: '₱450 - ₱750',
    estimatedDuration: '1 hr',
    description: 'Brake pad wear assessment, caliper piston cleaning, and hydraulic fluid flush.',
    icon: Disc,
  },
  {
    id: 'Full PMS & Valve Clearance Check',
    title: 'Full PMS & Valve Clearance Check',
    category: 'Comprehensive Package',
    estimatedCost: '₱1,200 - ₱2,000',
    estimatedDuration: '3 - 4 hrs',
    description: 'Complete 30-point inspection, precision valve clearance tuning, spark plug, and drivetrain overhaul.',
    icon: Sparkles,
  },
  {
    id: 'Electrical & Battery Diagnostics',
    title: 'Electrical & Battery Diagnostics',
    category: 'Electrical Systems',
    estimatedCost: '₱400 - ₱750',
    estimatedDuration: '45 mins - 1 hr',
    description: 'Battery load rating test, charging system/stator check, starter relay, and wiring audit.',
    icon: Zap,
  },
];

export default function BookServiceTab({
  userId,
  motorcycles,
  selectedBikeId,
  setSelectedBikeId,
  activeTickets = [],
  onBookingComplete,
}: BookServiceTabProps) {
  // Mode: existing bike or register a new one
  const [bikeMode, setBikeMode] = useState<'existing' | 'new'>(
    motorcycles.length > 0 ? 'existing' : 'new'
  );

  // New bike inline fields
  const [newBikeModel, setNewBikeModel] = useState('');
  const [newBikePlate, setNewBikePlate] = useState('');
  const [catalog, setCatalog] = useState<BikeModel[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Selected service package
  const [serviceType, setServiceType] = useState('Change Oil & Routine Inspection');

  // Selected date (defaults to today)
  const [dropoffDate, setDropoffDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Optional notes
  const [notes, setNotes] = useState('');
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
        if (isMounted) {
          setCatalog(fullCatalog);
        }
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

  // Active duplicate check: same plate + same date + same service type
  const activeDuplicate = useMemo(() => {
    const selectedExistingBike = motorcycles.find((b) => b.id === selectedBikeId);
    const targetPlate =
      bikeMode === 'existing' && selectedExistingBike
        ? selectedExistingBike.plate_number
        : newBikePlate;

    if (!targetPlate || !targetPlate.trim()) return null;
    const cleanTarget = cleanPlate(targetPlate);

    return (activeTickets || []).find((ticket) => {
      const ticketPlate = ticket.motorcycles?.plate_number
        ? cleanPlate(ticket.motorcycles.plate_number)
        : '';
      const ticketDate = ticket.dropoff_date || '';
      const ticketService = ticket.service_type || '';

      return (
        ticketPlate === cleanTarget &&
        ticketDate === dropoffDate &&
        ticketService === serviceType &&
        ticket.status !== 'CANCELLED' &&
        ticket.status !== 'COMPLETED'
      );
    });
  }, [bikeMode, selectedBikeId, motorcycles, newBikePlate, activeTickets, dropoffDate, serviceType]);

  // Selected service package details
  const selectedPackage = useMemo(() => {
    return (
      SERVICE_PACKAGES.find((p) => p.id === serviceType) ||
      SERVICE_PACKAGES[0]
    );
  }, [serviceType]);

  // 7-day schedule strip
  const upcomingSchedule = useMemo(() => Object.values(getMockReservationsSchedule(7)), []);

  // Current day capacity calculation based on 10 daily slots
  const currentCapacity = useMemo(() => {
    const baseCap = getBayCapacity(dropoffDate);
    // Count real user bookings in activeTickets for this date
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

  // Filtered bikes for autocomplete dropdown
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setErrorMsg('Please log in to book a service reservation.');
      return;
    }

    if (currentCapacity.status === 'FULL') {
      setErrorMsg(
        `Workshop is fully booked for ${dropoffDate} (10 of 10 slots occupied). Please choose another date.`
      );
      return;
    }

    if (activeDuplicate) {
      setErrorMsg(
        `Duplicate Booking: You already have an active booking (Ticket #${activeDuplicate.ticket_code}) for this motorcycle on ${dropoffDate} with "${serviceType}".`
      );
      return;
    }

    let targetMotorcycleId = selectedBikeId;

    // Register new bike if in 'new' mode
    if (bikeMode === 'new' || motorcycles.length === 0) {
      if (!newBikeModel.trim()) {
        setErrorMsg('Please enter or select your motorcycle model.');
        return;
      }
      if (!newBikePlate.trim()) {
        setErrorMsg('Please enter your plate number or MV file number.');
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
        setErrorMsg(err instanceof Error ? err.message : 'Failed to register motorcycle details.');
        setLoading(false);
        return;
      }
    }

    if (!targetMotorcycleId) {
      setErrorMsg('Please select or specify a motorcycle for the service.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
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
        notes: notes.trim() || null,
      });

      if (ticketError) throw ticketError;

      setNewBikeModel('');
      setNewBikePlate('');
      setNotes('');
      await onBookingComplete();
    } catch (err: unknown) {
      console.error('Booking submission error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit service booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Service Appointment
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              <Info className="w-3 h-3 text-slate-400" />
              Daily Limit: 10 Slots
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Book a Service
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Schedule priority maintenance or repair for your motorcycle. Fast, reliable, and guaranteed.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 sm:text-right shrink-0">
          <p className="text-[11px] uppercase font-bold tracking-wider text-blue-600">Workshop Capacity</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">10 Bikes / Day</p>
          <p className="text-[11px] text-slate-500 mt-0.5">To ensure precision quality</p>
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-sm shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold">Booking Notice</strong>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Duplicate Booking Detected Alert */}
      {activeDuplicate && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-900 text-sm shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-amber-950">Active Reservation Already Exists</strong>
            <p className="text-xs text-amber-800 mt-0.5">
              You already have Ticket <strong>#{activeDuplicate.ticket_code}</strong> for this motorcycle scheduled on <strong>{dropoffDate}</strong>. Duplicate reservations on the same date are restricted.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* STEP 1: SELECT MOTORCYCLE */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-900">Select Motorcycle</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 pl-8">
                Choose a vehicle from your registered garage or enter a new one.
              </p>
            </div>

            {motorcycles.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBikeMode(bikeMode === 'existing' ? 'new' : 'existing');
                  if (errorMsg) setErrorMsg(null);
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                {bikeMode === 'existing' ? (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Book a different motorcycle</span>
                  </>
                ) : (
                  <>
                    <Bike className="w-3.5 h-3.5" />
                    <span>Choose from saved garage ({motorcycles.length})</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Mode A: Select from existing motorcycles */}
          {bikeMode === 'existing' && motorcycles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {motorcycles.map((bike) => {
                const isSelected = selectedBikeId === bike.id;
                return (
                  <div
                    key={bike.id}
                    onClick={() => setSelectedBikeId(bike.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Bike className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 leading-tight">{bike.model}</p>
                        <p className="font-mono text-xs text-slate-500 font-semibold mt-0.5">
                          {bike.plate_number}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Mode B: Fast New Motorcycle Input */
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>New vehicle will be automatically saved to your garage upon booking.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Autocomplete Model input */}
                <div className="space-y-1.5 relative" ref={dropdownRef}>
                  <label className="block text-xs font-bold text-slate-700">
                    Motorcycle Model <span className="text-rose-500">*</span>
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
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {isDropdownOpen && filteredBikes.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {filteredBikes.map((bike, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setNewBikeModel(bike.name);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-blue-50 flex items-center justify-between group transition"
                        >
                          <div>
                            <span className="font-bold text-slate-800 group-hover:text-blue-700 block">
                              {bike.name}
                            </span>
                            <span className="text-[10px] text-slate-400">{bike.brand}</span>
                          </div>
                          <span className="text-[11px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100">
                            Select
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Plate Number input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Plate / MV File Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBikePlate}
                    onChange={(e) => setNewBikePlate(e.target.value.toUpperCase())}
                    placeholder="e.g. ND 45821 / TEMP MV"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: CHOOSE SERVICE PACKAGE */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-base font-bold text-slate-900">Choose Service Package</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-8">
              Click a package below. Transparent cost estimates and turnaround time are listed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {SERVICE_PACKAGES.map((pkg) => {
              const isSelected = serviceType === pkg.id;
              const Icon = pkg.icon;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setServiceType(pkg.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {pkg.category}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 leading-snug mt-0.5">
                        {pkg.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                      {pkg.estimatedCost}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {pkg.estimatedDuration}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 3: TARGET DROP-OFF DATE & CAPACITY (MAX 10 SLOTS) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h2 className="text-base font-bold text-slate-900">Target Drop-off Date</h2>
              </div>

              {/* Status Badge */}
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
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
                  ? 'Fully Booked (0/10 Slots)'
                  : currentCapacity.status === 'LIMITED'
                  ? `High Demand (${currentCapacity.remainingSlots} Slots Left)`
                  : `${currentCapacity.remainingSlots} of 10 Slots Available`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-8">
              Daily workshop intake is strictly capped at 10 slots to ensure thorough inspection and rapid turnaround.
            </p>
          </div>

          {/* Quick 7-Day Calendar Strip */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Quick 7-Day Selection</label>
            <div className="grid grid-cols-7 gap-2">
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
                    className={`p-2.5 rounded-2xl text-center flex flex-col items-center justify-between border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                        : isFull
                        ? 'bg-rose-50/80 border-rose-200 text-rose-800 hover:bg-rose-100/80'
                        : isLimited
                        ? 'bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100/80'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold opacity-80">
                      {day.dayLabel.split(' ')[0]}
                    </span>
                    <span className="text-base font-black my-1">
                      {day.date.split('-')[2]}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isFull
                          ? 'bg-rose-200/80 text-rose-900'
                          : isLimited
                          ? 'bg-amber-200/80 text-amber-950'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isFull ? 'FULL' : isLimited ? `${day.remainingSlots} LEFT` : `${day.remainingSlots} OPEN`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exact Calendar Date Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Or Select a Specific Date</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={dropoffDate}
              onChange={(e) => {
                setDropoffDate(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-600 transition"
            />
          </div>

          {/* Full Capacity Warning */}
          {currentCapacity.status === 'FULL' && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800 font-semibold">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>All 10 daily reservation slots are fully booked for this date. Please pick another date.</span>
            </div>
          )}
        </div>

        {/* STEP 4: OPTIONAL NOTES / SYMPTOMS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                4
              </span>
              <h2 className="text-base font-bold text-slate-900">Symptoms & Instructions (Optional)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-8">
              Let the technician know if you're experiencing unusual sounds, vibrations, or specific part requests.
            </p>
          </div>

          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Squeaking front brakes, hard morning start, vibration when accelerating past 40 kph..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition resize-none leading-relaxed"
          />
        </div>

        {/* STEP 5: BOOKING SUMMARY & CONFIRMATION */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Summary Review</p>
              <h3 className="text-xl font-black text-white mt-0.5">Booking Confirmation</h3>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block">Estimated Package Price</span>
              <span className="text-xl font-black text-emerald-400">{selectedPackage.estimatedCost}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Motorcycle</span>
              <strong className="text-sm font-bold text-white block mt-1">
                {bikeMode === 'existing' && selectedExistingBike
                  ? selectedExistingBike.model
                  : newBikeModel || 'Pending Model'}
              </strong>
              <span className="font-mono text-slate-400 text-xs mt-0.5 block">
                {bikeMode === 'existing' && selectedExistingBike
                  ? selectedExistingBike.plate_number
                  : newBikePlate || 'NO PLATE'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Package</span>
              <strong className="text-sm font-bold text-white block mt-1">
                {selectedPackage.title}
              </strong>
              <span className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Est. {selectedPackage.estimatedDuration}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Drop-off Date</span>
              <strong className="text-sm font-bold text-white block mt-1">
                {new Date(dropoffDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </strong>
              <span className="text-emerald-400 text-xs font-semibold mt-0.5 block">
                Slot #{currentCapacity.occupiedCount + 1} of 10 Daily Limit
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || currentCapacity.status === 'FULL' || Boolean(activeDuplicate)}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-lg ${
              activeDuplicate
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed'
                : currentCapacity.status === 'FULL'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Confirming your reservation...</span>
              </>
            ) : activeDuplicate ? (
              <>
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>Duplicate Booking on this Date</span>
              </>
            ) : currentCapacity.status === 'FULL' ? (
              <>
                <ShieldAlert className="w-5 h-5 text-slate-500" />
                <span>Date Fully Booked — Please Select Another Date</span>
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                <span>Confirm Service Booking</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
