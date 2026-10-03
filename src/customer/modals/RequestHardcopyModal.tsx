import { useState } from 'react';
import { 
  X, 
  Bike, 
  CheckCircle2, 
  ShieldCheck, 
  Loader2, 
  MapPin, 
  Clock, 
  Stamp,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { UserProfile } from '../../types/dashboard';
import { createHardcopyRequest, HardcopyRequest } from '../../lib/hardcopyService';

interface RequestHardcopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userProfile: UserProfile | null;
  uniqueBikes: Array<{ model: string; plate_number: string }>;
  initialBikePlate?: string;
  onSuccess: (newReq: HardcopyRequest) => void;
}

const PURPOSES = [
  {
    id: 'resale',
    title: 'Motorcycle Resale / Transfer of Ownership',
    desc: 'Official proof of maintenance history for prospective buyer.',
  },
  {
    id: 'warranty',
    title: 'Warranty or Insurance Claim',
    desc: 'Certified record of genuine fluid changes & inspections.',
  },
  {
    id: 'financing',
    title: 'Bank / Financing / Loan Documentation',
    desc: 'Formal vehicle valuation and maintenance verification.',
  },
  {
    id: 'personal',
    title: 'Personal Rider Archive',
    desc: 'Physical stamped record copy for personal logbook.',
  },
];

export default function RequestHardcopyModal({
  isOpen,
  onClose,
  userId,
  userProfile,
  uniqueBikes,
  initialBikePlate = 'all',
  onSuccess,
}: RequestHardcopyModalProps) {
  const [selectedPlate, setSelectedPlate] = useState<string>(() => {
    if (initialBikePlate && initialBikePlate !== 'all') {
      return initialBikePlate;
    }
    return uniqueBikes[0]?.plate_number || 'all';
  });

  const [selectedPurpose, setSelectedPurpose] = useState<string>(PURPOSES[0].title);
  const [customNotes, setCustomNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const targetBike = uniqueBikes.find(
    (b) => b.plate_number.toLowerCase() === selectedPlate.toLowerCase()
  );

  const bikeModelName = targetBike ? targetBike.model : 'All Fleet Registered Units';
  const bikePlateName = targetBike ? targetBike.plate_number : 'Fleet Units';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setErrorMsg('Please sign in to request an official copy.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await createHardcopyRequest({
        userId,
        customerName: userProfile?.full_name || 'Rider Member',
        customerPhone: userProfile?.phone_number || 'N/A',
        bikeModel: bikeModelName,
        plateNumber: bikePlateName,
        purpose: selectedPurpose,
        notes: customNotes.trim(),
      });

      if (!res) {
        throw new Error('Unable to send hardcopy request. Please try again.');
      }

      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="my-auto bg-white border border-slate-200/90 rounded-2xl sm:rounded-[2rem] max-w-lg w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Sticky Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  Request Certified Hardcopy
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800">
                  Certified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                Physical stamped record with Lead Tech sign-off • Santa Maria Hub
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Vehicle Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-orange-500" />
              <span>Select Motorcycle Record to Print:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {uniqueBikes.map((bike) => {
                const isSelected = selectedPlate.toLowerCase() === bike.plate_number.toLowerCase();
                return (
                  <button
                    key={bike.plate_number}
                    type="button"
                    onClick={() => setSelectedPlate(bike.plate_number)}
                    className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/60 shadow-xs ring-1 ring-orange-500'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                    }`}
                  >
                    <span className="font-bold text-slate-900 text-xs truncate">
                      {bike.model}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {bike.plate_number}
                    </span>
                  </button>
                );
              })}

              {uniqueBikes.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedPlate('all')}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                    selectedPlate === 'all'
                      ? 'border-orange-500 bg-orange-50/60 shadow-xs ring-1 ring-orange-500'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                  }`}
                >
                  <span className="font-bold text-slate-900 text-xs">
                    All Fleet Units
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Complete History Ledger
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Purpose Selection Dropdown / Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span>Purpose / Documentation Need:</span>
            </label>

            <div className="relative">
              <select
                value={selectedPurpose}
                onChange={(e) => setSelectedPurpose(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium appearance-none focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 cursor-pointer pr-10"
              >
                {PURPOSES.map((p) => (
                  <option key={p.id} value={p.title}>
                    {p.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            <p className="text-[11px] text-slate-500 pl-1 leading-normal">
              {PURPOSES.find((p) => p.title === selectedPurpose)?.desc}
            </p>
          </div>

          {/* 3. Special Instructions / Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span>Special Instructions / Notes (Optional):</span>
              <span className="text-[10px] text-slate-400 font-normal">e.g. Dry seal needed</span>
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Stamped with official dry seal for LTO transfer..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition"
            />
          </div>

          {/* 4. Workshop Notice & Pickup Counter Info */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-slate-600">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Claim Location: Santa Maria Front Desk Reception</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Dry Seal & Sign-off</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span>Est. 1-2 Hours</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
              An instant notification alert will pop up on your dashboard as soon as the Admin finishes certifying your copy.
            </p>
          </div>

          {/* Spacer to guarantee scroll padding */}
          <div className="h-1" />
        </form>

        {/* Sticky Footer Action Bar */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20 transition cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Hardcopy Request</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
