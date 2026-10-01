import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Motorcycle, BikeModel, ServiceTicket } from '../../types/dashboard';
import {
  AlertCircle,
  Loader2,
  ChevronDown,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Search,
  Plus,
  Bike
} from 'lucide-react';
import { getBayCapacity, DAILY_MAX_CAPACITY } from '../../utils/mockReservations';
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
  estimatedCost: string;
  estimatedDuration: string;
}

const SERVICE_PACKAGES: ServicePackageOption[] = [
  {
    id: 'Change Oil & Routine Inspection',
    title: 'Change Oil & Routine Inspection',
    estimatedCost: '₱350 - ₱600',
    estimatedDuration: '30 - 45 mins',
  },
  {
    id: 'CVT Cleaning, Regrease & Belt Check',
    title: 'CVT Cleaning, Regrease & Belt Check',
    estimatedCost: '₱550 - ₱850',
    estimatedDuration: '1 - 1.5 hrs',
  },
  {
    id: 'FI Diagnostic & Throttle Body Cleaning',
    title: 'FI Diagnostic & Throttle Body Cleaning',
    estimatedCost: '₱650 - ₱950',
    estimatedDuration: '1 - 1.5 hrs',
  },
  {
    id: 'Brake Caliper Overhaul & Fluid Flush',
    title: 'Brake Caliper Overhaul & Fluid Flush',
    estimatedCost: '₱450 - ₱750',
    estimatedDuration: '1 hr',
  },
  {
    id: 'Full PMS & Valve Clearance Check',
    title: 'Full PMS & Valve Clearance Check',
    estimatedCost: '₱1,200 - ₱2,000',
    estimatedDuration: '3 - 4 hrs',
  },
  {
    id: 'Electrical & Battery Diagnostics',
    title: 'Electrical & Battery Diagnostics',
    estimatedCost: '₱400 - ₱750',
    estimatedDuration: '45 mins - 1 hr',
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

  // Background daily capacity check (strictly capped at 10 slots per day for thesis/panel rule)
  const isDateFullyBooked = useMemo(() => {
    const baseCap = getBayCapacity(dropoffDate);
    const realBookingsOnDate = (activeTickets || []).filter(
      (t) => t.dropoff_date === dropoffDate && t.status !== 'CANCELLED'
    ).length;

    const totalOccupied = Math.max(baseCap.occupiedCount, realBookingsOnDate);
    return totalOccupied >= DAILY_MAX_CAPACITY;
  }, [dropoffDate, activeTickets]);

  // Filtered bikes for autocomplete dropdown
  const filteredBikes = useMemo(() => {
    if (!newBikeModel.trim()) return catalog.slice(0, 8);
    const query = newBikeModel.toLowerCase();
    return catalog
      .filter((b) => b.name.toLowerCase().includes(query) || b.brand.toLowerCase().includes(query))
      .slice(0, 10);
  }, [catalog, newBikeModel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setErrorMsg('Please log in to book a service appointment.');
      return;
    }

    if (isDateFullyBooked) {
      setErrorMsg(
        `This date (${dropoffDate}) is fully booked. Please choose another date.`
      );
      return;
    }

    if (activeDuplicate) {
      setErrorMsg(
        `You already have an active booking (Ticket #${activeDuplicate.ticket_code}) for this motorcycle on ${dropoffDate} with "${serviceType}".`
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Main Single Clean Form Card matching Overview & Profile design */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        
        {/* Header matching dashboard tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-snug">
              Book a Service
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Schedule maintenance or repair for your motorcycle.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 self-start sm:self-auto">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Service Appointment</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Active Duplicate Alert */}
        {activeDuplicate && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              You already have Ticket <strong>#{activeDuplicate.ticket_code}</strong> booked for this motorcycle on <strong>{dropoffDate}</strong>.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          
          {/* FIELD 1: MOTORCYCLE UNIT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 block text-xs">
                Motorcycle Unit <span className="text-rose-500">*</span>
              </label>

              {motorcycles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBikeMode(bikeMode === 'existing' ? 'new' : 'existing');
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition"
                >
                  {bikeMode === 'existing' ? (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Book a different motorcycle</span>
                    </>
                  ) : (
                    <>
                      <Bike className="w-3 h-3" />
                      <span>Choose from saved bikes ({motorcycles.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Mode A: Select from existing bikes */}
            {bikeMode === 'existing' && motorcycles.length > 0 ? (
              <div className="relative">
                <select
                  required
                  value={selectedBikeId}
                  onChange={(e) => setSelectedBikeId(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-slate-800 text-xs focus:outline-none focus:border-blue-600 transition"
                >
                  {motorcycles.map((bike) => (
                    <option key={bike.id} value={bike.id}>
                      {bike.model} ({bike.plate_number})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              /* Mode B: Fast New Motorcycle Input */
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="text-[11px] text-slate-500">
                  Enter your motorcycle details below. It will automatically save to your garage upon booking:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 relative" ref={dropdownRef}>
                    <span className="text-[11px] font-medium text-slate-700 block">
                      Motorcycle Model <span className="text-rose-500">*</span>
                    </span>
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
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pr-7 text-slate-800 text-xs focus:outline-none focus:border-blue-600 transition"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {isDropdownOpen && filteredBikes.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-52 overflow-y-auto divide-y divide-slate-100">
                        {filteredBikes.map((bike, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setNewBikeModel(bike.name);
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between group transition"
                          >
                            <div>
                              <span className="font-semibold text-slate-800 group-hover:text-blue-700 block">
                                {bike.name}
                              </span>
                              <span className="text-[10px] text-slate-400">{bike.brand}</span>
                            </div>
                            <span className="text-[10px] text-blue-600 font-medium opacity-0 group-hover:opacity-100">
                              Select
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-700 block">
                      Plate / MV File Number <span className="text-rose-500">*</span>
                    </span>
                    <input
                      type="text"
                      required
                      value={newBikePlate}
                      onChange={(e) => setNewBikePlate(e.target.value.toUpperCase())}
                      placeholder="e.g. ND 45821 / TEMP"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono uppercase text-slate-800 text-xs focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FIELD 2: SERVICE PACKAGE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 block text-xs">
                Service Package <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-emerald-600">
                Estimated Price: {selectedPackage.estimatedCost}
              </span>
            </div>

            <div className="relative">
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-slate-800 text-xs focus:outline-none focus:border-blue-600 transition"
              >
                {SERVICE_PACKAGES.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.title} ({pkg.estimatedCost} • Est. {pkg.estimatedDuration})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* FIELD 3: TARGET DROP-OFF DATE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 block text-xs">
                Target Drop-off Date <span className="text-rose-500">*</span>
              </label>

              {isDateFullyBooked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  Fully Booked (Please pick another day)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Date Available
                </span>
              )}
            </div>

            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={dropoffDate}
              onChange={(e) => {
                setDropoffDate(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs focus:outline-none focus:border-blue-600 transition"
            />
          </div>

          {/* FIELD 4: SYMPTOMS / NOTES (OPTIONAL) */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block text-xs">
              Symptoms / Specific Requests <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe any unusual noise, vibration, or parts replacement request..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs focus:outline-none focus:border-blue-600 transition resize-none leading-relaxed"
            />
          </div>

          {/* FIELD 5: CLEAN SUMMARY FOOTER & CONFIRM BUTTON */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-500 block">Total Estimated Cost</span>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {selectedPackage.estimatedCost}
              </div>
              <span className="text-[10px] text-slate-400 block">
                Estimated turnaround: {selectedPackage.estimatedDuration}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || isDateFullyBooked || Boolean(activeDuplicate)}
              className={`font-semibold text-xs py-2.5 px-6 rounded-xl transition flex items-center justify-center gap-2 ${
                activeDuplicate
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed'
                  : isDateFullyBooked
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting reservation...</span>
                </>
              ) : activeDuplicate ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Already Booked for this Date</span>
                </>
              ) : isDateFullyBooked ? (
                <span>Fully Booked — Select Another Date</span>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Confirm Booking</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
