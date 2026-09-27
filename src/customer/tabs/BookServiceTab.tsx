import { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Motorcycle, BikeModel, ServiceTicket } from '../../types/dashboard';
import {
  Calendar,
  AlertCircle,
  Loader2,
  ChevronDown,
  Wrench,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Search,
  Sparkles,
  Plus
} from 'lucide-react';
import { getBayCapacity, getMockReservationsSchedule } from '../../utils/mockReservations';
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

export default function BookServiceTab({
  userId,
  motorcycles,
  selectedBikeId,
  setSelectedBikeId,
  activeTickets = [],
  serviceHistory = [],
  onBookingComplete,
}: BookServiceTabProps) {
  // Mode kung gagamit ng dati nang motor o magta-type ng bago on the spot
  const [bikeMode, setBikeMode] = useState<'existing' | 'new'>(
    motorcycles.length > 0 ? 'existing' : 'new'
  );

  // New bike inline fields
  const [newBikeModel, setNewBikeModel] = useState('');
  const [newBikePlate, setNewBikePlate] = useState('');
  const [catalog, setCatalog] = useState<BikeModel[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Booking fields
  const [serviceType, setServiceType] = useState('Change Oil & Routine Inspection');
  const [dropoffDate, setDropoffDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close catalog suggestions kapag nag-click sa labas
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch catalog: 185 Philippine base models + mga na-save nang bagong models
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

  // Tiyakin na naka-select ang valid bike kapag may laman ang motorcycles
  useEffect(() => {
    if (motorcycles.length > 0) {
      if (!selectedBikeId || !motorcycles.some((b) => b.id === selectedBikeId)) {
        setSelectedBikeId(motorcycles[0].id);
      }
    } else {
      setBikeMode('new');
    }
  }, [motorcycles, selectedBikeId, setSelectedBikeId]);

  // Normalizer para sa plate number matching
  const cleanPlate = (str: string) => str.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // Smart Plate Detection: Habang nagta-type ang user, iche-check kung na-save na dati ang motor
  const matchedExistingBike = useMemo(() => {
    if (bikeMode !== 'new' || !newBikePlate.trim()) return null;
    const inputClean = cleanPlate(newBikePlate);
    if (!inputClean || inputClean.length < 3) return null;
    return motorcycles.find((b) => cleanPlate(b.plate_number) === inputClean) || null;
  }, [bikeMode, newBikePlate, motorcycles]);

  // Kasalukuyang napiling motor sa existing list
  const selectedExistingBike = useMemo(() => {
    return motorcycles.find((b) => b.id === selectedBikeId) || motorcycles[0];
  }, [motorcycles, selectedBikeId]);

  // Realtime Duplicate Check: Same motorcycle plate + Same date + Same service type
  const activeDuplicate = useMemo(() => {
    const targetPlate =
      bikeMode === 'existing' && selectedExistingBike
        ? selectedExistingBike.plate_number
        : matchedExistingBike
        ? matchedExistingBike.plate_number
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
  }, [
    bikeMode,
    selectedExistingBike,
    matchedExistingBike,
    newBikePlate,
    activeTickets,
    dropoffDate,
    serviceType,
  ]);

  // Bilangin kung pang-ilang serbisyo na ito para sa napiling motor
  const currentMotorcycleVisits = useMemo(() => {
    const targetPlate =
      bikeMode === 'existing' && selectedExistingBike
        ? selectedExistingBike.plate_number
        : matchedExistingBike
        ? matchedExistingBike.plate_number
        : null;

    if (!targetPlate) return 0;
    const targetClean = cleanPlate(targetPlate);

    const activeCount = (activeTickets || []).filter(
      (t) => t.motorcycles?.plate_number && cleanPlate(t.motorcycles.plate_number) === targetClean
    ).length;
    const historyCount = (serviceHistory || []).filter(
      (t) => t.motorcycles?.plate_number && cleanPlate(t.motorcycles.plate_number) === targetClean
    ).length;

    return activeCount + historyCount;
  }, [bikeMode, selectedExistingBike, matchedExistingBike, activeTickets, serviceHistory]);

  // Technical Breakdown para sa bawat serbisyo
  const serviceCatalog: Record<
    string,
    { time: string; cost: string; items: string[] }
  > = {
    'Change Oil & Routine Inspection': {
      time: '30 – 45 mins',
      cost: '₱350 - ₱600',
      items: [
        'Drain old oil and fill with recommended viscosity grade',
        'Oil strainer inspection and magnetic plug cleaning',
        'Tire pressure and brake lever play adjustment',
        'Drive chain / final gear oil level check'
      ]
    },
    'FI Diagnostic & Throttle Body Cleaning': {
      time: '1 – 1.5 hrs',
      cost: '₱650 - ₱950',
      items: [
        'Throttle body removal and intake manifold degrease',
        'Fuel injector spray pattern and ultrasonic cleaning',
        'ECU diagnostic scan and fault code reset',
        'Throttle Position Sensor (TPS) idle calibration'
      ]
    },
    'CVT Cleaning, Regrease & Belt Check': {
      time: '1 – 1.5 hrs',
      cost: '₱550 - ₱850',
      items: [
        'Drive belt width and micro-crack inspection',
        'Variator pulley and roller weight flat-spot check',
        'Clutch bell and shoe deglazing / sanding',
        'Application of high-temperature CVT torque grease'
      ]
    },
    'Brake Caliper Overhaul & Fluid Flush': {
      time: '1 hr',
      cost: '₱450 - ₱750',
      items: [
        'Caliper piston disassembly and seal cleaning',
        'DOT 4 synthetic brake fluid line flush and bleed',
        'Brake pad wear and rotor runout check',
        'Master cylinder pressure test'
      ]
    },
    'Full PMS & Valve Clearance Check': {
      time: '3 – 4 hrs',
      cost: '₱1,200 - ₱2,000',
      items: [
        'Precision feeler gauge intake/exhaust valve clearance adjustment',
        'Spark plug electrode gap check / replacement',
        'Full chassis, swingarm, and engine mount bolt torquing',
        'Coolant check and complete drivetrain diagnostic'
      ]
    },
    'Electrical & Battery Diagnostics': {
      time: '45 mins – 1 hr',
      cost: '₱400 - ₱750',
      items: [
        'Battery load test and cold-cranking amp rating',
        'Stator coil AC output and rectifier charging rate test',
        'Main fuse block, starter relay, and wiring harness audit',
        'Grounding point resistance test'
      ]
    }
  };

  const currentDetails = serviceCatalog[serviceType] || serviceCatalog['Change Oil & Routine Inspection'];
  const upcomingSchedule = useMemo(() => Object.values(getMockReservationsSchedule(7)), []);
  const currentCapacity = getBayCapacity(dropoffDate);

  // Filtered models para sa autocomplete
  const filteredBikes = useMemo(() => {
    if (!newBikeModel.trim()) return catalog.slice(0, 10);
    const query = newBikeModel.toLowerCase();
    return catalog
      .filter((b) => b.name.toLowerCase().includes(query) || b.brand.toLowerCase().includes(query))
      .slice(0, 12);
  }, [catalog, newBikeModel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setErrorMsg('Please log in to book a service reservation.');
      return;
    }

    if (currentCapacity.status === 'FULL') {
      setErrorMsg(
        `All 4 workshop service bays are fully booked for ${dropoffDate}. Please choose another available date.`
      );
      return;
    }

    if (activeDuplicate) {
      setErrorMsg(
        `Duplicate Booking Detected: You already have an active reservation (Ticket #${activeDuplicate.ticket_code}) for this motorcycle on ${dropoffDate} with "${serviceType}". Please pick another date or service.`
      );
      return;
    }

    let targetMotorcycleId = selectedBikeId;

    // Kapag bagong motor ang inilagay, suriin muna kung nag-e-exist na (Smart Deduplication)
    if (bikeMode === 'new' || motorcycles.length === 0) {
      if (!newBikeModel.trim()) {
        setErrorMsg('Please enter or select your motorcycle model.');
        return;
      }
      if (!newBikePlate.trim()) {
        setErrorMsg('Please enter your plate number or temporary plate / MV file number.');
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const inputClean = cleanPlate(newBikePlate);

        // 1. Local list check
        const localMatch = motorcycles.find((b) => cleanPlate(b.plate_number) === inputClean);

        if (localMatch) {
          targetMotorcycleId = localMatch.id;
          setSelectedBikeId(localMatch.id);
        } else {
          // 2. Database query check para maiwasan ang duplicate plate sa user
          const { data: existingDbBike } = await supabase
            .from('motorcycles')
            .select('id, model, plate_number')
            .eq('user_id', userId)
            .ilike('plate_number', newBikePlate.trim())
            .maybeSingle();

          if (existingDbBike) {
            targetMotorcycleId = existingDbBike.id;
            setSelectedBikeId(existingDbBike.id);
          } else {
            // 3. Tunay na bagong unit: i-insert sa database
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
        }

        // I-save din ang model name sa global catalog para sa future bookings
        if (newBikeModel.trim()) {
          await registerNewMotorcycleModel(newBikeModel.trim());
          getCompleteMotorcycleCatalog().then(setCatalog);
        }
      } catch (err: unknown) {
        console.error('Error auto-registering motorcycle:', err);
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
      // 4. Database-level Duplicate check bago mag-insert
      const { data: dbDuplicate } = await supabase
        .from('service_tickets')
        .select('id, ticket_code')
        .eq('user_id', userId)
        .eq('motorcycle_id', targetMotorcycleId)
        .eq('service_type', serviceType)
        .eq('dropoff_date', dropoffDate)
        .in('status', ['IN_PROGRESS', 'READY_FOR_PICKUP'])
        .maybeSingle();

      if (dbDuplicate) {
        setErrorMsg(
          `Duplicate Booking: You already have an active reservation (Ticket #${dbDuplicate.ticket_code}) for this motorcycle on ${dropoffDate} with "${serviceType}". Duplicate bookings on the same day are not allowed.`
        );
        setLoading(false);
        return;
      }

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
        total_estimate: currentDetails.cost,
        status: 'IN_PROGRESS',
        dropoff_date: dropoffDate,
        notes: notes.trim() || null,
      });

      if (ticketError) throw ticketError;

      // Reset fields
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
    <div className="space-y-4">
      {/* Top Context Row */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          Queue Intake
        </span>
        <span className="text-xs text-slate-500">
          Direct bay reservation and priority service scheduling.
        </span>
      </div>

      {/* Duplicate Booking Warning Banner */}
      {activeDuplicate && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-900 text-xs shadow-xs animate-fadeIn">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="block font-bold text-amber-950">
              Duplicate Booking Detected
            </strong>
            <span>
              Mayroon ka nang active reservation (Ticket #{activeDuplicate.ticket_code}) para sa motor na ito sa petsang{' '}
              <strong>{dropoffDate}</strong> para sa <strong>&quot;{serviceType}&quot;</strong>.
              Pumili ng ibang petsa o ibang serbisyo upang makapagpatuloy.
            </span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2-Column Split: Booking Form sa Kaliwa, Inclusions & Capacity sa Kanan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Kaliwa (7 cols): Main Booking Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* MOTORCYCLE SELECTION / INLINE ENTRY */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 block text-xs">
                  Motorcycle Unit
                </label>

                {motorcycles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setBikeMode(bikeMode === 'existing' ? 'new' : 'existing');
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition"
                  >
                    {bikeMode === 'existing' ? (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Book different motorcycle</span>
                      </>
                    ) : (
                      <span>← Choose from saved bikes ({motorcycles.length})</span>
                    )}
                  </button>
                )}
              </div>

              {/* Mode A: Pumili sa existing saved bikes */}
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
                /* Mode B: Mabilis na inline bike entry na may 185 Philippine Catalog suggestions */
                <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200/90 rounded-xl">
                  {motorcycles.length === 0 ? (
                    <div className="flex items-center gap-2 text-[11px] text-blue-700 bg-blue-50/70 border border-blue-100 p-2 rounded-lg">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>
                        Enter your bike model & plate below. It will automatically save to your account upon booking!
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">
                      Adding a new motorcycle to your booking. Select from the catalog or type a custom model:
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Model Autocomplete with 185+ Philippine catalog */}
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
                          placeholder="e.g. Honda Click 125i, NMAX, Aerox..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pr-7 text-slate-800 text-xs focus:outline-none focus:border-blue-600 transition"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Dropdown Suggestions with Philippine catalog */}
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
                                <span className="font-semibold text-slate-800 group-hover:text-blue-700">
                                  {bike.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {bike.brand}
                                </span>
                              </div>
                              <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 font-medium">
                                Select
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Plate Number */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-700 block">
                        Plate / MV File No. <span className="text-rose-500">*</span>
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

                  {/* Smart Detection Banner kung umiiral na ang plate */}
                  {matchedExistingBike && (
                    <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Vehicle recognized: <strong>{matchedExistingBike.model}</strong> ({matchedExistingBike.plate_number})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBikeId(matchedExistingBike.id);
                          setBikeMode('existing');
                          setNewBikePlate('');
                          setNewBikeModel('');
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[10px] shrink-0 transition"
                      >
                        Use Saved Unit
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SERVICE PACKAGE SELECTOR */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 block">
                Service Package
              </label>
              <div className="relative">
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-slate-800 text-xs focus:outline-none focus:border-blue-600 transition"
                >
                  {Object.keys(serviceCatalog).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* TARGET DROPOFF DATE & 7-DAY STRIP */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 block text-xs">
                  Target Drop-off Date
                </label>
                {currentCapacity.status === 'FULL' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    Fully Booked (4/4 Bays Taken)
                  </span>
                )}
                {currentCapacity.status === 'LIMITED' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Filling Fast (1 Bay Left)
                  </span>
                )}
                {currentCapacity.status === 'AVAILABLE' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Bays Available ({4 - currentCapacity.occupiedCount} Open)
                  </span>
                )}
              </div>

              {/* 7-Day Quick Capacity Strip */}
              <div className="grid grid-cols-7 gap-1 pt-0.5">
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
                      className={`p-1.5 sm:p-2 rounded-xl text-center flex flex-col items-center justify-between border transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : isFull
                          ? 'bg-rose-50/70 border-rose-200 text-rose-700 hover:bg-rose-100/70'
                          : isLimited
                          ? 'bg-amber-50/70 border-amber-200 text-amber-800 hover:bg-amber-100/70'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[9px] sm:text-[10px] uppercase font-semibold opacity-80">
                        {day.dayLabel.split(' ')[0]}
                      </span>
                      <span className="text-xs font-bold my-0.5">
                        {day.date.split('-')[2]}
                      </span>
                      <span
                        className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : isFull
                            ? 'bg-rose-200/60 text-rose-800'
                            : isLimited
                            ? 'bg-amber-200/60 text-amber-900'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isFull ? 'FULL' : isLimited ? '1 LEFT' : 'OPEN'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Exact Date Picker Input */}
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

              {/* Visual 4-Bay Occupancy Indicators */}
              <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700">Workshop Bay Allocation for {dropoffDate}:</span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {currentCapacity.occupiedCount} of 4 Bays Occupied
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {currentCapacity.bays.map((bay) => (
                    <div
                      key={bay.bayNumber}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        bay.isOccupied
                          ? 'bg-white border-rose-200 shadow-2xs'
                          : 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] font-bold text-slate-600">
                          {bay.bayName}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            bay.isOccupied ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                      <div className="text-[10px] truncate font-medium text-slate-700">
                        {bay.isOccupied ? bay.bikeModel : 'Available'}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {bay.isOccupied ? bay.serviceType : 'Open for Intake'}
                      </div>
                    </div>
                  ))}
                </div>

                {currentCapacity.status === 'FULL' && (
                  <div className="flex items-center gap-1.5 text-rose-700 text-[11px] font-semibold pt-1">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>All 4 service bays are occupied for this date. Please choose another date.</span>
                  </div>
                )}
              </div>
            </div>

            {/* SYMPTOMS / NOTES */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 block">
                Symptoms / Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe any unusual sound, vibration, or parts replacement request..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs focus:outline-none focus:border-blue-600 transition resize-none leading-relaxed"
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading || currentCapacity.status === 'FULL' || Boolean(activeDuplicate)}
              className={`w-full mt-2 font-semibold text-xs sm:text-sm py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-xs ${
                activeDuplicate
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed'
                  : currentCapacity.status === 'FULL'
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : activeDuplicate ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Already Booked for this Date & Service</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>
                    {currentCapacity.status === 'FULL'
                      ? 'Date Fully Booked (Pick Another Day)'
                      : 'Confirm Drop-off Reservation'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Kanan (5 cols): Live Package Technical Scope & Details */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Service Inclusions
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              {currentDetails.cost}
            </span>
          </div>

          {/* Detailed Unit Preview & History Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                  Target Vehicle
                </span>
                {bikeMode === 'new' && !matchedExistingBike ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                    Auto-Save
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Detected
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                {bikeMode === 'existing' && selectedExistingBike
                  ? selectedExistingBike.plate_number
                  : matchedExistingBike
                  ? matchedExistingBike.plate_number
                  : newBikePlate || 'NO PLATE'}
              </span>
            </div>

            <div>
              <span className="text-sm font-bold text-slate-900 block">
                {bikeMode === 'existing' && selectedExistingBike
                  ? selectedExistingBike.model
                  : matchedExistingBike
                  ? matchedExistingBike.model
                  : newBikeModel || 'Pending Selection'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {bikeMode === 'existing' && selectedExistingBike
                  ? currentMotorcycleVisits > 0
                    ? `Visit #${currentMotorcycleVisits + 1} for this unit (${currentMotorcycleVisits} previous service${currentMotorcycleVisits > 1 ? 's' : ''})`
                    : 'First service booking for this unit'
                  : matchedExistingBike
                  ? `Matched existing unit • Visit #${currentMotorcycleVisits + 1}`
                  : 'New unit will be saved automatically upon booking'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Selected Service:</span>
              <span className="font-semibold text-blue-600 truncate max-w-[190px]">
                {serviceType}
              </span>
            </div>
          </div>

          {/* Checklist ng gagawin */}
          <div className="space-y-2">
            <span className="text-[11px] text-slate-400 font-semibold block uppercase">
              Work Scope
            </span>
            <div className="space-y-2 text-xs text-slate-600">
              {currentDetails.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Duration Tag */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Estimated bay duration:
            </span>
            <strong className="text-slate-800 font-semibold">{currentDetails.time}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
