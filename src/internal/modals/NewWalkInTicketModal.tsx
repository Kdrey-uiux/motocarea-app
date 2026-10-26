import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { getCompleteMotorcycleCatalog, OfficialBikeModel } from '../../utils/motorcycleCatalog';
import { X, User, Gauge, Loader2, CheckCircle2, Search, AlertTriangle, Bike } from '../../components/icons';
import { getSharedServiceCatalog } from '../../utils/serviceCatalog';
import { getWorkshopCapacity, isSundayDate } from '../../utils/workshopCapacity';
import { toast } from '../utils/toast';
import ServicePicker from '../components/ServicePicker';
import WalkInClaimSlipModal, { WalkInSlipInfo } from './WalkInClaimSlipModal';
import { newWalkInCode } from '../../utils/ticketCode';
import { validatePersonName, validatePHMobile, phMobileDigits, formatPHMobile, toPHMobileInput, validatePlate, type FieldError } from '../../utils/validators';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

interface NewWalkInTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
  currentStaffName?: string;
}

// Postgres unique_violation (e.g. a ticket code that already exists)
const UNIQUE_VIOLATION = '23505';
const MAX_CODE_ATTEMPTS = 5;

function localDateString(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const sectionLabel = 'font-display text-sm font-bold tracking-tight text-slate-900';
const fieldLabel = 'text-xs font-medium text-slate-600 block mb-1.5';
const inputBase =
  'w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:not-italic placeholder:text-slate-400 focus:outline-none focus:ring-4 transition';
const inputClass = `${inputBase} border-slate-200 focus:border-orange-500 focus:ring-orange-500/10`;
const inputErrorClass = `${inputBase} border-rose-400 focus:border-rose-500 focus:ring-rose-500/10`;

const NOTES_MAX = 300;
type FieldKey = 'name' | 'phone' | 'model' | 'plate' | 'odometer' | 'service' | 'notes';
// Order used to jump to the first field that needs fixing
const FIELD_ORDER: FieldKey[] = ['name', 'phone', 'model', 'plate', 'odometer', 'service', 'notes'];

/** Small red line under a field */
function FieldMessage({ id, error }: { id: string; error: FieldError }) {
  if (!error) return null;
  return (
    <span id={id} role="alert" className="mt-1 flex items-start gap-1 text-xs text-rose-600">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
      {error}
    </span>
  );
}

export default function NewWalkInTicketModal({
  isOpen,
  onClose,
  onTicketCreated,
  currentStaffName = 'Service Advisor',
}: NewWalkInTicketModalProps) {
  const serviceCatalog = useMemo(() => getSharedServiceCatalog(), []);
  const availableServices = useMemo(() => serviceCatalog.map((s) => s.title || s.name), [serviceCatalog]);

  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [motorcycleModel, setMotorcycleModel] = useState('');
  const [odometer, setOdometer] = useState('');
  const [selectedService, setSelectedService] = useState(() => availableServices[0] || '');
  const [complaintNotes, setComplaintNotes] = useState('');

  // Catalog combobox state
  const [catalog, setCatalog] = useState<OfficialBikeModel[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // A field shows its error after the user leaves it, or after a submit try
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [triedSubmit, setTriedSubmit] = useState(false);
  // Claim slip shown right after the ticket is created, so the customer leaves with their ticket number
  const [createdSlip, setCreatedSlip] = useState<WalkInSlipInfo | null>(null);

  useEffect(() => {
    let isMounted = true;
    getCompleteMotorcycleCatalog()
      .then((list) => {
        if (isMounted) setCatalog(list);
      })
      .catch((err) => console.warn('Failed to load catalog:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBikes = useMemo(() => {
    if (!motorcycleModel.trim()) return catalog.slice(0, 8);
    const query = motorcycleModel.toLowerCase();
    return catalog
      .filter((b) => b.name.toLowerCase().includes(query) || b.brand.toLowerCase().includes(query))
      .slice(0, 10);
  }, [catalog, motorcycleModel]);

  const fieldErrors: Record<FieldKey, FieldError> = {
    name: validatePersonName(customerName),
    phone: validatePHMobile(contactNumber),
    model: !motorcycleModel.trim()
      ? 'Pick or type the motorcycle model.'
      : motorcycleModel.trim().length < 2
        ? 'Model name is too short.'
        : motorcycleModel.trim().length > 60
          ? 'Keep the model under 60 characters.'
          : null,
    plate: validatePlate(plateNumber),
    odometer: odometer.replace(/\D/g, '').length > 7 ? 'That reading looks too high. Check the odometer.' : null,
    service: !selectedService ? (availableServices.length ? 'Pick a service.' : 'No services set up yet. Add one in Services.') : null,
    notes: complaintNotes.length > NOTES_MAX ? `Keep it under ${NOTES_MAX} characters.` : null,
  };
  const shownError = (key: FieldKey): FieldError => (touched[key] || triedSubmit ? fieldErrors[key] : null);
  const markTouched = (key: FieldKey) => () => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  const fieldProps = (key: FieldKey) => ({
    id: `walkin-${key}`,
    onBlur: markTouched(key),
    'aria-invalid': Boolean(shownError(key)),
    'aria-describedby': shownError(key) ? `walkin-${key}-error` : undefined,
  });

  if (!isOpen) return null;

  if (createdSlip) {
    return (
      <WalkInClaimSlipModal
        slip={createdSlip}
        onClose={() => {
          setCreatedSlip(null);
          onTicketCreated();
          onClose();
        }}
      />
    );
  }

  const resetForm = () => {
    setCustomerName('');
    setContactNumber('');
    setPlateNumber('');
    setMotorcycleModel('');
    setOdometer('');
    setSelectedService(availableServices[0] || '');
    setComplaintNotes('');
    setErrorMessage(null);
    setTouched({});
    setTriedSubmit(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Check every field first; jump to the first one that needs fixing
    const firstInvalid = FIELD_ORDER.find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setTriedSubmit(true);
      document.getElementById(`walkin-${firstInvalid}`)?.focus();
      return;
    }

    const cleanName = customerName.trim().replace(/\s+/g, ' ');
    const cleanPhone = formatPHMobile(phMobileDigits(contactNumber) as string);
    const cleanPlate = plateNumber.trim().toUpperCase().replace(/\s+/g, ' ');
    const cleanModel = motorcycleModel.trim();
    const cleanOdometer = odometer.replace(/[^\d]/g, '');

    setLoading(true);
    try {
      // 0. Workshop rules: closed on Sundays, max daily capacity (local date, not UTC)
      const todayStr = localDateString();
      if (isSundayDate(todayStr)) {
        setErrorMessage('The workshop is closed on Sundays. Walk-in tickets cannot be created today.');
        return;
      }
      const { count: todayCount } = await db()
        .from('service_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('dropoff_date', todayStr)
        .not('status', 'in', '("CANCELLED","CANCELLED_BY_ADMIN","MISSED","NO_SHOW")');
      const dailyCapacity = getWorkshopCapacity();
      if (typeof todayCount === 'number' && todayCount >= dailyCapacity) {
        setErrorMessage(
          `Today is fully booked (${dailyCapacity} of ${dailyCapacity} slots). No more walk-ins can be accepted today.`
        );
        return;
      }

      // 1. Reuse the motorcycle if this plate is already on file, otherwise register it
      let motorcycleId: string;
      const { data: existingBike } = await db()
        .from('motorcycles')
        .select('id')
        .eq('plate_number', cleanPlate)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingBike) {
        motorcycleId = existingBike.id;
        if (cleanOdometer) {
          await db().from('motorcycles').update({ odometer: `${cleanOdometer} km` }).eq('id', motorcycleId);
        }
      } else {
        const { data: newBike, error: bikeError } = await db()
          .from('motorcycles')
          .insert({
            plate_number: cleanPlate,
            model: cleanModel,
            odometer: cleanOdometer ? `${cleanOdometer} km` : '0 km',
          })
          .select('id')
          .single();
        if (bikeError || !newBike) {
          throw new Error(`Could not save the motorcycle: ${bikeError?.message || 'unknown error'}`);
        }
        motorcycleId = newBike.id;
      }

      // 2. Notes use the same labels as online bookings so every screen can read them
      const notesPayload = [
        `Customer: ${cleanName}`,
        `Contact: ${cleanPhone}`,
        complaintNotes.trim() ? `Reported Symptoms: ${complaintNotes.trim().replace(/[|\n]+/g, ' ')}` : null,
        cleanOdometer ? `Odometer: ${cleanOdometer} km` : null,
        'Arrival Window: Walk-in',
        `Intake by: ${currentStaffName}`,
      ]
        .filter(Boolean)
        .join(' | ');

      // 3. Create the ticket, retrying with a new code if one is already taken
      let ticketCode = '';
      let createdAt = new Date().toISOString();
      for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
        ticketCode = newWalkInCode();
        const { data: createdRow, error: ticketError } = await db().from('service_tickets').insert({
          ticket_code: ticketCode,
          motorcycle_id: motorcycleId,
          service_type: selectedService,
          stage: 1,
          status: 'IN_PROGRESS',
          dropoff_date: todayStr,
          notes: notesPayload,
          is_walk_in: true,
        }).select('created_at').single();
        if (!ticketError) {
          if (createdRow?.created_at) createdAt = createdRow.created_at;
          break;
        }
        if (ticketError.code !== UNIQUE_VIOLATION || attempt === MAX_CODE_ATTEMPTS) throw ticketError;
      }

      await recordAuditLog({
        ticketCode,
        action: 'WALK_IN_TICKET_CREATED',
        actor: currentStaffName,
        details: `Walk-in ticket created for ${cleanName} (${cleanModel} - ${cleanPlate}). Service: ${selectedService}`,
        newValue: 'Stage 1 (Checked in)',
      });
      broadcastTicketSync({ ticket_code: ticketCode, action: 'walk_in_created' });

      toast.success(`Walk-in #${ticketCode} created for ${cleanName}. Give the customer their ticket slip.`);
      resetForm();
      setCreatedSlip({
        ticketCode,
        customerName: cleanName,
        bikeModel: cleanModel,
        plateNumber: cleanPlate,
        serviceType: selectedService,
        createdAt,
      });
    } catch (err: unknown) {
      console.error('Failed to create walk-in ticket:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create the walk-in ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <ScrollLock />
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white text-slate-900 w-full max-w-lg rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/80 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                New walk-in
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">The customer is here now. The job starts at Stage 1.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (scrolls) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm bg-slate-50/40">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Customer */}
          <section className="space-y-3">
            <p className={sectionLabel}>Customer</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className={fieldLabel}>
                  Name <span className="text-orange-600">*</span>
                </span>
                <span className="relative block">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    autoComplete="off"
                    maxLength={60}
                    placeholder="e.g. Juan Dela Cruz"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    {...fieldProps('name')}
                    className={`${shownError('name') ? inputErrorClass : inputClass} pl-9`}
                  />
                </span>
                <FieldMessage id="walkin-name-error" error={shownError('name')} />
              </label>
              <label className="block">
                <span className={fieldLabel}>
                  Mobile number <span className="text-orange-600">*</span>
                </span>
                {/* Fixed +63 in front, 10 digits after it (same as rider sign-up) */}
                <span className="relative block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 pointer-events-none select-none">
                    +63
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    autoComplete="off"
                    placeholder="917 123 4567"
                    value={contactNumber}
                    // Digits only; a pasted 0917… or +63 917… is trimmed to the 10 digits
                    onChange={(e) => setContactNumber(toPHMobileInput(e.target.value))}
                    {...fieldProps('phone')}
                    className={`${shownError('phone') ? inputErrorClass : inputClass} pl-12 tabular-nums tracking-wide`}
                  />
                </span>
                <FieldMessage id="walkin-phone-error" error={shownError('phone')} />
              </label>
            </div>
          </section>

          {/* Motorcycle */}
          <section className="space-y-3">
            <p className={sectionLabel}>Motorcycle</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 relative" ref={dropdownRef}>
                <label className="block">
                  <span className={fieldLabel}>
                    Model <span className="text-orange-600">*</span>
                  </span>
                  <span className="relative block">
                    <input
                      type="text"
                      required
                      placeholder="Search e.g. Click 125i, NMAX"
                      value={motorcycleModel}
                      onChange={(e) => {
                        setMotorcycleModel(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'Enter') {
                          if (e.key !== 'Tab' && isDropdownOpen) e.preventDefault();
                          setIsDropdownOpen(false);
                        }
                      }}
                      autoComplete="off"
                      maxLength={60}
                      {...fieldProps('model')}
                      className={`${shownError('model') ? inputErrorClass : inputClass} pr-8`}
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </span>
                  <FieldMessage id="walkin-model-error" error={shownError('model')} />
                </label>

                {isDropdownOpen && (filteredBikes.length > 0 || motorcycleModel.trim().length > 0) && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {filteredBikes.map((bike) => (
                      <button
                        key={bike.id || bike.name}
                        type="button"
                        onClick={() => {
                          setMotorcycleModel(bike.name);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="font-semibold text-slate-800 truncate">{bike.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{bike.brand}</span>
                      </button>
                    ))}
                    {motorcycleModel.trim().length > 0 &&
                      !filteredBikes.some((b) => b.name.toLowerCase() === motorcycleModel.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(false)}
                          className="w-full text-left px-3 py-2.5 text-xs bg-orange-50/70 hover:bg-orange-100 text-orange-900 font-semibold transition cursor-pointer truncate"
                        >
                          Use “{motorcycleModel.trim()}” (not in the list)
                        </button>
                      )}
                  </div>
                )}
              </div>

              <label className="block">
                <span className={fieldLabel}>
                  Plate no. <span className="text-orange-600">*</span>
                </span>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  maxLength={17}
                  placeholder="e.g. NDE 1234"
                  value={plateNumber}
                  // Letters, digits, spaces and dashes only
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9\s-]/g, ''))}
                  {...fieldProps('plate')}
                  className={`${shownError('plate') ? inputErrorClass : inputClass} font-mono font-bold`}
                />
                <FieldMessage id="walkin-plate-error" error={shownError('plate')} />
              </label>
            </div>

            <label className="block sm:w-1/2">
              <span className={fieldLabel}>Odometer (km)</span>
              <span className="relative block">
                <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 14250"
                  value={odometer}
                  maxLength={9}
                  onChange={(e) => setOdometer(e.target.value.replace(/[^\d,]/g, ''))}
                  {...fieldProps('odometer')}
                  className={`${shownError('odometer') ? inputErrorClass : inputClass} pl-9 font-mono`}
                />
              </span>
              <FieldMessage id="walkin-odometer-error" error={shownError('odometer')} />
            </label>
          </section>

          {/* Service */}
          <section className="space-y-3">
            <p className={sectionLabel}>Service</p>
            {/* A div, not a label: the picker has its own buttons inside */}
            <div>
              <span id="walkin-service-label" className={fieldLabel}>
                Service <span className="text-orange-600">*</span>
              </span>
              <ServicePicker
                id="walkin-service"
                services={serviceCatalog}
                value={selectedService}
                onChange={setSelectedService}
                onBlur={markTouched('service')}
                invalid={Boolean(shownError('service'))}
                describedBy={shownError('service') ? 'walkin-service-error' : undefined}
              />
              <FieldMessage id="walkin-service-error" error={shownError('service')} />
            </div>
            <label className="block">
              <span className={fieldLabel}>What's the problem? (customer's own words)</span>
              <textarea
                rows={3}
                placeholder="e.g. Rattling noise when accelerating, weak brakes"
                value={complaintNotes}
                onChange={(e) => setComplaintNotes(e.target.value)}
                {...fieldProps('notes')}
                className={`${shownError('notes') || complaintNotes.length > NOTES_MAX ? inputErrorClass : inputClass} resize-none`}
              />
              <span className="mt-1 flex items-start justify-between gap-2">
                <FieldMessage id="walkin-notes-error" error={complaintNotes.length > NOTES_MAX ? fieldErrors.notes : null} />
                <span className={`ml-auto text-[11px] tabular-nums ${complaintNotes.length > NOTES_MAX ? 'text-rose-600' : 'text-slate-400'}`}>
                  {complaintNotes.length}/{NOTES_MAX}
                </span>
              </span>
            </label>
          </section>
        </div>

        {/* Footer (always visible) */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer text-sm active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Create walk-in
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
