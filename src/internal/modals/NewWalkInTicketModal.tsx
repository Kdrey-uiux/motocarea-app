import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { getCompleteMotorcycleCatalog, OfficialBikeModel } from '../../utils/motorcycleCatalog';
import { 
  X, 
  User, 
  Phone, 
  Gauge, 
  Wrench, 
  Plus, 
  Loader2, 
  CheckCircle2,
  Search
} from 'lucide-react';

import { getSharedServiceCatalog } from '../../utils/serviceCatalog';
import {
  FIXED_WORKSHOP_CAPACITY,
  isSundayDate
} from '../../utils/workshopCapacity';

interface NewWalkInTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
  currentStaffName?: string;
}

export default function NewWalkInTicketModal({
  isOpen,
  onClose,
  onTicketCreated,
  currentStaffName = 'Service Advisor',
}: NewWalkInTicketModalProps) {
  const availableServices = useMemo(() => {
    return getSharedServiceCatalog().map((s) => s.title || s.name);
  }, []);

  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [motorcycleModel, setMotorcycleModel] = useState('');
  const [odometer, setOdometer] = useState('');
  const [selectedService, setSelectedService] = useState(() => availableServices[0] || 'Standard Oil Change & Safety Inspection');
  const [complaintNotes, setComplaintNotes] = useState('');

  // Catalog combobox state
  const [catalog, setCatalog] = useState<OfficialBikeModel[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        const list = await getCompleteMotorcycleCatalog();
        if (isMounted) setCatalog(list);
      } catch (err) {
        console.warn('Failed to load catalog:', err);
      }
    }
    loadCatalog();
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const cleanName = customerName.trim();
    const cleanPhone = contactNumber.trim();
    const cleanPlate = plateNumber.trim().toUpperCase();
    const cleanModel = motorcycleModel.trim();

    if (!cleanName || !cleanPhone || !cleanPlate || !cleanModel) {
      setErrorMessage('Please fill in Customer Name, Contact Number, Plate Number, and Motorcycle Model.');
      setLoading(false);
      return;
    }

    try {
      // 0. Pre-check workshop capacity ceiling (Fixed 10 Bays, Closed Sunday)
      const todayStr = new Date().toISOString().split('T')[0];
      if (isSundayDate(todayStr)) {
        setErrorMessage('The workshop is closed on Sundays (shop rest day). Walk-in tickets cannot be created today.');
        setLoading(false);
        return;
      }

      try {
        const { count: activeCount } = await supabase
          .from('service_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('dropoff_date', todayStr)
          .not('status', 'in', '("CANCELLED","CANCELLED_BY_ADMIN","MISSED","NO_SHOW")');

        if (typeof activeCount === 'number' && activeCount >= FIXED_WORKSHOP_CAPACITY) {
          setErrorMessage(`The workshop has reached maximum daily capacity (${FIXED_WORKSHOP_CAPACITY} / ${FIXED_WORKSHOP_CAPACITY} bays occupied). No additional walk-in units can be accepted at this time to maintain service safety and quality.`);
          setLoading(false);
          return;
        }
      } catch (capErr) {
        console.warn('Capacity pre-check warning:', capErr);
      }

      // 1. Generate unique Walk-in Ticket Code (e.g. #MC-W-7842)
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `MC-W-${randomDigits}`;

      // 2. Insert or get motorcycle record
      let motorcycleId = '';
      try {
        const { data: motoData, error: motoError } = await supabase
          .from('motorcycles')
          .insert({
            plate_number: cleanPlate,
            model: cleanModel,
            odometer: odometer.trim() ? `${odometer.trim()} km` : '0 km',
            year_model: '2024',
          })
          .select('id')
          .maybeSingle();

        if (!motoError && motoData) {
          motorcycleId = motoData.id;
        }
      } catch {
        // ignore motorcycle error if table constrained
      }

      // 3. Prepare notes payload with structured metadata
      const notesPayload = [
        `Customer: ${cleanName}`,
        `Contact: ${cleanPhone}`,
        odometer.trim() ? `Odometer: ${odometer.trim()} km` : null,
        'Arrival Window: Walk-in Immediate Intake',
        complaintNotes.trim() ? `Complaints: ${complaintNotes.trim()}` : 'Walk-in express service',
        `Intake by: ${currentStaffName}`,
      ]
        .filter(Boolean)
        .join(' | ');

      // 4. Insert service ticket
      const ticketPayload: any = {
        ticket_code: ticketCode,
        service_type: selectedService,
        stage: 1,
        status: 'IN_PROGRESS',
        dropoff_date: todayStr,
        notes: notesPayload,
        is_walk_in: true,
        created_at: new Date().toISOString(),
      };

      if (motorcycleId) {
        ticketPayload.motorcycle_id = motorcycleId;
      }

      const { error: ticketError } = await supabase
        .from('service_tickets')
        .insert(ticketPayload);

      if (ticketError) throw ticketError;

      // 5. Record Audit Trail
      await recordAuditLog({
        ticketCode,
        action: 'WALK_IN_TICKET_CREATED',
        actor: currentStaffName,
        details: `Walk-in intake ticket created for ${cleanName} (${cleanModel} - ${cleanPlate}). Service: ${selectedService}`,
        newValue: `Stage 1 (Queued)`,
      });

      // 6. Realtime dispatch broadcast
      broadcastTicketSync({ ticket_code: ticketCode, action: 'walk_in_created' });

      onTicketCreated();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to create walk-in ticket:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to register walk-in ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                New Walk-In Service Ticket
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct floor intake for walk-in customers
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Customer Name <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan Dela Cruz"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Mobile Number <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 0917-123-4567"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Motorcycle Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative" ref={dropdownRef}>
              <label className="font-bold text-slate-700 block mb-1">
                Motorcycle Model <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Honda Click 125i, Yamaha NMAX..."
                  value={motorcycleModel}
                  onChange={(e) => {
                    setMotorcycleModel(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pr-7 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {isDropdownOpen && (filteredBikes.length > 0 || motorcycleModel.trim().length > 0) && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filteredBikes.map((bike, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMotorcycleModel(bike.name);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-semibold text-slate-800">{bike.name}</span>
                      <span className="text-[10px] text-slate-400">{bike.brand}</span>
                    </button>
                  ))}
                  {motorcycleModel.trim().length > 0 && !filteredBikes.some((b) => b.name.toLowerCase() === motorcycleModel.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs bg-orange-50/70 hover:bg-orange-100 text-orange-900 font-semibold flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="truncate pr-2">+ Use &quot;{motorcycleModel.trim()}&quot; as custom model</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-200/80 text-orange-950 font-bold uppercase shrink-0">Custom</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Plate Number <span className="text-orange-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. NDE 1234"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs uppercase font-mono font-bold"
              />
            </div>
          </div>

          {/* Odometer Mileage */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Current Odometer Reading (km)
            </label>
            <div className="relative">
              <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. 14,250"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          {/* Requested Service */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Selected Service Package <span className="text-orange-600">*</span>
            </label>
            <div className="relative">
              <Wrench className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium cursor-pointer"
              >
                {availableServices.map((srv, i) => (
                  <option key={i} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Complaints / Floor Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Customer Complaints & Special Instructions
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Rattling noise in transmission, low brake response, hard starting in morning..."
              value={complaintNotes}
              onChange={(e) => setComplaintNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Ticket...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Walk-In Ticket</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
