import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { InternalTicket, InternalStaffMember, BillingLineItem } from '../types/internal';
import { getActiveTechnicians } from '../utils/databaseStaffManager';
import { 
  X, 
  Wrench, 
  AlertTriangle, 
  Loader2,
  CheckCircle2,
  Receipt,
  History,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  User,
  ArrowRight
} from 'lucide-react';
import VehicleHistoryModal from './VehicleHistoryModal';
import { toast } from '../utils/toast';

interface DispatchTicketModalProps {
  ticket: InternalTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  allTickets: InternalTicket[];
  staffList: InternalStaffMember[];
  onOpenStage5Billing?: (ticket: InternalTicket) => void;
  currentStaffName?: string;
}

function normalizeBayNumber(bayStr?: string | null): number | null {
  if (!bayStr) return null;
  const match = bayStr.match(/(?:bay|lift|#)?[\s-]*0?(\d+)/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

const BAYS = [
  { id: 'Bay 01', num: 1, name: 'Bay 01', type: 'Quick Service & Oil Express' },
  { id: 'Bay 02', num: 2, name: 'Bay 02', type: 'CVT Cleaning & Tuning' },
  { id: 'Bay 03', num: 3, name: 'Bay 03', type: 'Engine Repair & Overhaul' },
  { id: 'Bay 04', num: 4, name: 'Bay 04', type: 'Electrical & Wiring Lab' },
  { id: 'Bay 05', num: 5, name: 'Bay 05', type: 'Brakes & Suspension' },
  { id: 'Bay 06', num: 6, name: 'Bay 06', type: 'FI Cleaning & Calibration' },
  { id: 'Bay 07', num: 7, name: 'Bay 07', type: 'Tires & Wheel Alignment' },
  { id: 'Bay 08', num: 8, name: 'Bay 08', type: 'General Mechanical' },
  { id: 'Bay 09', num: 9, name: 'Bay 09', type: 'Major Body & Chassis' },
  { id: 'Bay 10', num: 10, name: 'Bay 10', type: 'Final Testing & Quality Check' },
];

const STAGES = [
  { stage: 1, label: 'Stage 1: Intake & Check-in', desc: 'Awaiting bay lift assignment' },
  { stage: 2, label: 'Stage 2: Bay Inspection', desc: 'Active diagnosis on lift' },
  { stage: 3, label: 'Stage 3: Active Repair', desc: 'Parts installation and mechanical repair' },
  { stage: 4, label: 'Stage 4: Quality Testing', desc: 'Road test and safety verification' },
  { stage: 5, label: 'Stage 5: Ready for Release', desc: 'Completed, ready for pickup & billing' },
];

export default function DispatchTicketModal({
  ticket,
  isOpen,
  onClose,
  onSaved,
  allTickets,
  staffList,
  onOpenStage5Billing,
  currentStaffName = 'Workshop Staff',
}: DispatchTicketModalProps) {
  const [assignedBay, setAssignedBay] = useState('Bay 01');
  const [assignedMechanic, setAssignedMechanic] = useState('');
  const [stage, setStage] = useState<number>(2);
  const [status, setStatus] = useState<string>('IN_PROGRESS');
  const [estimatedPickup, setEstimatedPickup] = useState('');
  const [notes, setNotes] = useState('');
  const [billingBreakdown, setBillingBreakdown] = useState<BillingLineItem[]>([]);
  const [isAddingAuth, setIsAddingAuth] = useState(false);
  const [authItemName, setAuthItemName] = useState('');
  const [authItemPrice, setAuthItemPrice] = useState('');
  const [authItemReason, setAuthItemReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const availableMechanics = useMemo(() => {
    return getActiveTechnicians(staffList);
  }, [staffList]);

  // Compute live occupancy for each bay to prevent double-booking
  const bayOccupancyMap = useMemo(() => {
    const map = new Map<number, { ticketCode: string; bikeModel: string; plate: string }>();
    allTickets
      .filter(
        (t) =>
          t.id !== ticket?.id &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED' &&
          t.status !== 'CANCELLED_BY_ADMIN' &&
          t.status !== 'MISSED' &&
          t.status !== 'NO_SHOW' &&
          t.assigned_bay
      )
      .forEach((t) => {
        const bayNum = normalizeBayNumber(t.assigned_bay);
        if (bayNum) {
          map.set(bayNum, {
            ticketCode: t.ticket_code,
            bikeModel: t.motorcycles?.model || 'Motorcycle',
            plate: t.motorcycles?.plate_number || 'NO PLATE',
          });
        }
      });
    return map;
  }, [allTickets, ticket]);

  useEffect(() => {
    if (ticket) {
      // Find first available bay if unassigned
      let initialBay = ticket.assigned_bay;
      if (!initialBay) {
        const firstFreeBay = BAYS.find((b) => !bayOccupancyMap.has(b.num));
        initialBay = firstFreeBay ? firstFreeBay.id : 'Bay 01';
      }
      setAssignedBay(initialBay);
      setAssignedMechanic(ticket.assigned_mechanic || availableMechanics[0]?.name || 'Assigned Staff');
      
      // Auto-advance Stage 1 tickets to Stage 2 upon bay assignment
      if (ticket.stage === 1) {
        setStage(2);
      } else {
        setStage(ticket.stage || 2);
      }

      setStatus(ticket.status || 'IN_PROGRESS');
      setEstimatedPickup(ticket.estimated_pickup || 'Today, 4:00 PM');
      setNotes(ticket.notes || '');
      setBillingBreakdown(Array.isArray(ticket.billing_breakdown) ? [...ticket.billing_breakdown] : []);
      setIsAddingAuth(false);
      setErrorMsg(null);
    }
  }, [ticket, availableMechanics, bayOccupancyMap]);

  const handleAddAuthorization = () => {
    const cleanName = authItemName.trim();
    const cleanPrice = parseFloat(authItemPrice);
    const cleanReason = authItemReason.trim();

    if (!cleanName || isNaN(cleanPrice) || cleanPrice <= 0) {
      toast.error('Please specify a valid item name and amount.');
      return;
    }

    const newItem: BillingLineItem = {
      id: `auth-${Date.now()}`,
      name: cleanName,
      quantity: 1,
      unitPrice: cleanPrice,
      subtotal: cleanPrice,
      isAdditional: true,
      approvalStatus: 'PENDING',
      reason: cleanReason || 'Diagnostic inspection finding',
      requestedAt: new Date().toISOString(),
    };

    setBillingBreakdown((prev) => [...prev, newItem]);
    setAuthItemName('');
    setAuthItemPrice('');
    setAuthItemReason('');
    setIsAddingAuth(false);
  };

  const handleRemoveAuthorization = (id: string) => {
    setBillingBreakdown((prev) => prev.filter((item) => item.id !== id));
  };

  if (!isOpen || !ticket) return null;

  const currentBayNum = normalizeBayNumber(assignedBay);
  const isCurrentBayOccupied = currentBayNum ? bayOccupancyMap.has(currentBayNum) : false;
  const currentBayOccupant = currentBayNum ? bayOccupancyMap.get(currentBayNum) : undefined;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // If advancing to Stage 5, route directly to Stage 5 Billing Modal
    if (Number(stage) === 5 && onOpenStage5Billing) {
      onClose();
      onOpenStage5Billing(ticket);
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const updates = {
        assigned_bay: assignedBay,
        assigned_mechanic: assignedMechanic,
        stage: Number(stage),
        status: Number(stage) === 5 ? 'READY_FOR_PICKUP' : status,
        estimated_pickup: estimatedPickup,
        notes: notes.trim() || null,
        billing_breakdown: billingBreakdown,
      };

      const { data, error } = await supabase
        .from('service_tickets')
        .update(updates)
        .eq('id', ticket.id)
        .select('id, ticket_code');

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          'Database rejected update due to PostgreSQL Row-Level Security. Please run migration 20261016_fix_service_tickets_rls.sql in Supabase SQL Editor.'
        );
      }

      // Broadcast update across all consoles
      broadcastTicketSync({ id: ticket.id, ticket_code: ticket.ticket_code, ...updates });

      // Record Audit Logs
      if (ticket.stage !== Number(stage)) {
        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'STAGE_CHANGE',
          actor: currentStaffName,
          details: `Stage updated to Stage ${stage}`,
          previousValue: `Stage ${ticket.stage}`,
          newValue: `Stage ${stage}`,
        });
      }

      if (ticket.assigned_bay !== assignedBay) {
        await recordAuditLog({
          ticketCode: ticket.ticket_code,
          action: 'BAY_ASSIGNMENT',
          actor: currentStaffName,
          details: `Motorcycle dispatched to ${assignedBay} (${assignedMechanic})`,
          previousValue: ticket.assigned_bay || 'Unassigned',
          newValue: assignedBay,
        });
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to dispatch ticket:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to dispatch ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900">Assign Bay & Dispatch</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">
                  #{ticket.ticket_code}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span>{ticket.motorcycles?.model || 'Motorcycle'}</span>
                <span>•</span>
                <span className="font-mono">{ticket.motorcycles?.plate_number || 'NO PLATE'}</span>
                <span>•</span>
                <span>{ticket.customer_name || 'Rider Customer'}</span>
                {ticket.motorcycles?.plate_number && (
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer ml-1"
                  >
                    <History className="w-3 h-3" />
                    <span>History</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Bay Selection: Interactive 10-Bay Workshop Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                Select Workshop Bay Lift (1 to 10)
              </label>
              <span className="text-[11px] text-slate-500">
                Selected: <strong className="text-orange-600">{assignedBay}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {BAYS.map((b) => {
                const isOcc = bayOccupancyMap.has(b.num);
                const occupant = bayOccupancyMap.get(b.num);
                const isSelected = assignedBay === b.id;

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setAssignedBay(b.id)}
                    className={`p-2.5 rounded-2xl border text-left transition relative cursor-pointer flex flex-col justify-between min-h-[72px] ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20'
                        : isOcc
                        ? 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-black ${isSelected ? 'text-orange-600' : 'text-slate-900'}`}>
                        {b.name}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected
                            ? 'bg-orange-500'
                            : isOcc
                            ? 'bg-amber-400'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    <div className="mt-1">
                      {isOcc ? (
                        <p className="text-[10px] text-amber-800 font-bold truncate">
                          #{occupant?.ticketCode}
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-700 font-semibold">
                          Available
                        </p>
                      )}
                      <p className="text-[9px] text-slate-400 truncate">
                        {b.type.split('&')[0]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bay Conflict Alert if selecting an occupied bay */}
            {isCurrentBayOccupied && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Notice:</strong> {assignedBay} currently has #{currentBayOccupant?.ticketCode} ({currentBayOccupant?.bikeModel} • {currentBayOccupant?.plate}) on the lift. Clear or swap before moving this motorcycle.
                </span>
              </div>
            )}
          </div>

          {/* Assigned Technician & Estimated Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                Assigned Mechanic / Lead
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={assignedMechanic}
                  onChange={(e) => setAssignedMechanic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition font-medium"
                >
                  {availableMechanics.map((m, idx) => (
                    <option key={idx} value={m.name}>
                      {m.name} — ({m.position})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                Estimated Ready / Pickup Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={estimatedPickup}
                  onChange={(e) => setEstimatedPickup(e.target.value)}
                  placeholder="e.g. Today, 4:00 PM"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition font-medium"
                />
              </div>
            </div>
          </div>

          {/* Workflow Stage Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                Service Workflow Stage
              </label>
              <span className="text-[11px] text-slate-500">
                Current: <strong>Stage {stage}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STAGES.filter(s => s.stage >= 2).map((s) => (
                <button
                  key={s.stage}
                  type="button"
                  onClick={() => setStage(s.stage)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    stage === s.stage
                      ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${stage === s.stage ? 'text-orange-600' : 'text-slate-900'}`}>
                      {s.label}
                    </span>
                    {stage === s.stage && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Parts / Work Authorization */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-slate-900 text-xs block">
                  Additional Work & Parts Authorization
                </label>
                <p className="text-[11px] text-slate-500">
                  Request customer approval for extra parts found during inspection.
                </p>
              </div>
              {!isAddingAuth && (
                <button
                  type="button"
                  onClick={() => setIsAddingAuth(true)}
                  className="px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Request Extra Parts</span>
                </button>
              )}
            </div>

            {/* List of authorizations */}
            {billingBreakdown.filter((item) => item.isAdditional).length > 0 && (
              <div className="space-y-2">
                {billingBreakdown
                  .filter((item) => item.isAdditional)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.name}</span>
                          <span className="font-bold text-orange-600">₱{item.unitPrice.toLocaleString()}</span>
                        </div>
                        {item.reason && (
                          <p className="text-[11px] text-slate-500 mt-0.5">Finding: {item.reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.approvalStatus === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Approved by Rider
                          </span>
                        )}
                        {item.approvalStatus === 'DECLINED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Declined by Rider
                          </span>
                        )}
                        {item.approvalStatus === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Awaiting Customer Response
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAuthorization(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Remove request"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Input form for adding authorization */}
            {isAddingAuth && (
              <div className="p-3.5 bg-white border border-orange-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Part / Service Item</label>
                    <input
                      type="text"
                      value={authItemName}
                      onChange={(e) => setAuthItemName(e.target.value)}
                      placeholder="e.g. Front Brake Pad Set"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Est. Price (₱)</label>
                    <input
                      type="number"
                      value={authItemPrice}
                      onChange={(e) => setAuthItemPrice(e.target.value)}
                      placeholder="450"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Inspection Finding / Reason</label>
                  <input
                    type="text"
                    value={authItemReason}
                    onChange={(e) => setAuthItemReason(e.target.value)}
                    placeholder="e.g. Pad lining worn out below 2mm minimum safety standard"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAuth(false);
                      setAuthItemName('');
                      setAuthItemPrice('');
                      setAuthItemReason('');
                    }}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAuthorization}
                    className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    Queue for Customer Approval
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mechanic Findings & Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
              Mechanic Findings & Floor Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Conducted CVT cleaning, inspected drive belt, adjusted valve lash to spec..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold rounded-xl transition cursor-pointer text-xs"
            >
              Cancel
            </button>

            {Number(stage) === 5 ? (
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center gap-2 text-xs shadow-xs cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Proceed to Counter Release</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center gap-2 text-xs shadow-xs cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Dispatch...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Bay & Dispatch</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {/* Vehicle Service History Modal */}
        {ticket.motorcycles && (
          <VehicleHistoryModal
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            tickets={allTickets}
            vehicle={{
              plate_number: ticket.motorcycles.plate_number || 'N/A',
              model: ticket.motorcycles.model || 'Motorcycle',
              year_model: ticket.motorcycles.year_model,
              odometer: ticket.motorcycles.odometer,
              owner_name: ticket.customer_name,
              owner_phone: ticket.customer_phone,
            }}
          />
        )}
      </div>
    </div>
  );
}
