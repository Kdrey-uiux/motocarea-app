import { useState } from 'react';
import { 
  FileText, 
  X, 
  Printer, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Stamp, 
  Bike, 
  User, 
  Phone,
  CheckCheck
} from 'lucide-react';
import { HardcopyRequest } from '../utils/hardcopyService';

interface HardcopyRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: HardcopyRequest[];
  onMarkReady: (req: HardcopyRequest) => void;
  onMarkClaimed: (req: HardcopyRequest) => void;
  onPrint: (req: HardcopyRequest) => void;
}

export default function HardcopyRequestsModal({
  isOpen,
  onClose,
  requests,
  onMarkReady,
  onMarkClaimed,
  onPrint,
}: HardcopyRequestsModalProps) {
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'READY_FOR_PICKUP' | 'CLAIMED'>('ALL');

  if (!isOpen) return null;

  const filteredRequests = requests.filter((r) => {
    if (filterTab === 'ALL') return true;
    return r.status === filterTab;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const readyCount = requests.filter((r) => r.status === 'READY_FOR_PICKUP').length;
  const claimedCount = requests.filter((r) => r.status === 'CLAIMED').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="my-auto bg-white border border-slate-200 rounded-2xl sm:rounded-[2rem] max-w-2xl w-full p-5 sm:p-7 shadow-2xl space-y-4 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Certified Hardcopy Requests
                </h3>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                    {pendingCount} Action Needed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage and certify requested official service ledgers for customer pickup.
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

        {/* Filter Pills */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-full font-semibold transition ${
              filterTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({requests.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('PENDING')}
            className={`px-3 py-1.5 rounded-full font-semibold transition flex items-center gap-1.5 ${
              filterTab === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>Pending</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('READY_FOR_PICKUP')}
            className={`px-3 py-1.5 rounded-full font-semibold transition flex items-center gap-1.5 ${
              filterTab === 'READY_FOR_PICKUP'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span>Ready for Pickup</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {readyCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('CLAIMED')}
            className={`px-3 py-1.5 rounded-full font-semibold transition ${
              filterTab === 'CLAIMED'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Claimed ({claimedCount})
          </button>
        </div>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
              <p>No hardcopy requests in this category.</p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3 transition hover:border-slate-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-200 px-2 py-0.5 rounded-md text-slate-800">
                      #{req.id}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(req.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {req.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock className="w-3 h-3 text-amber-600" />
                      PENDING PREPARATION
                    </span>
                  )}

                  {req.status === 'READY_FOR_PICKUP' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      READY FOR FRONT DESK CLAIM
                    </span>
                  )}

                  {req.status === 'CLAIMED' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                      <CheckCheck className="w-3 h-3 text-slate-500" />
                      CLAIMED / COMPLETED
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Customer
                    </span>
                    <div className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.customerName}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block font-mono pl-4.5">
                      {req.customerPhone}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Requested Motorcycle Record
                    </span>
                    <div className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Bike className="w-3.5 h-3.5 text-orange-500" />
                      <span>{req.bikeModel}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block font-mono pl-4.5">
                      Plate: {req.plateNumber}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400">Purpose: </span>
                    <span className="font-semibold text-slate-800">{req.purpose}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onPrint(req)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print Ledger</span>
                  </button>

                  {req.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => onMarkReady(req)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Ready for Pickup</span>
                    </button>
                  )}

                  {req.status === 'READY_FOR_PICKUP' && (
                    <button
                      type="button"
                      onClick={() => onMarkClaimed(req)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Confirm Claimed by Rider</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pickup Point: Santa Maria Main Workshop Front Desk</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
