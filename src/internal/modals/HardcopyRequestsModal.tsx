import { useState, useMemo } from 'react';
import { HardcopyRequest, updateHardcopyStatus } from '../../lib/hardcopyService';
import { 
  X, 
  Stamp, 
  CheckCircle2, 
  Printer, 
  Search, 
  FileText,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';

interface HardcopyRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: HardcopyRequest[];
  onRefresh: () => void;
  currentStaffName?: string;
}

export default function HardcopyRequestsModal({
  isOpen,
  onClose,
  requests,
  onRefresh,
  currentStaffName = 'Lead Service Advisor',
}: HardcopyRequestsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'READY_FOR_PICKUP' | 'CLAIMED'>('PENDING');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [printableRequest, setPrintableRequest] = useState<HardcopyRequest | null>(null);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          req.id.toLowerCase().includes(q) ||
          req.customerName.toLowerCase().includes(q) ||
          (req.customerPhone && req.customerPhone.toLowerCase().includes(q)) ||
          req.bikeModel.toLowerCase().includes(q) ||
          req.plateNumber.toLowerCase().includes(q) ||
          req.purpose.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => r.status === 'PENDING').length,
      ready: requests.filter((r) => r.status === 'READY_FOR_PICKUP').length,
      claimed: requests.filter((r) => r.status === 'CLAIMED').length,
    };
  }, [requests]);

  if (!isOpen) return null;

  const handleUpdateStatus = async (
    req: HardcopyRequest,
    nextStatus: 'READY_FOR_PICKUP' | 'CLAIMED'
  ) => {
    setUpdatingId(req.id);
    try {
      const ok = await updateHardcopyStatus({
        requestId: req.id,
        userId: req.userId,
        bikeModel: req.bikeModel,
        status: nextStatus,
      });

      if (ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update hardcopy status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePrintCertificate = (req: HardcopyRequest) => {
    setPrintableRequest(req);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Official Certified Hardcopy Requests
              </h3>
              <p className="text-xs text-slate-400">
                Customer requests for stamped & certified physical maintenance records
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

        {/* Toolbar & Filter Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by rider, plate, ID, or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-orange-500 font-medium"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'PENDING', label: 'Pending Signature', count: counts.pending, color: 'text-amber-700 bg-amber-50' },
                { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup', count: counts.ready, color: 'text-emerald-700 bg-emerald-50' },
                { id: 'CLAIMED', label: 'Claimed', count: counts.claimed, color: 'text-slate-600 bg-slate-100' },
                { id: 'ALL', label: 'All Requests', count: counts.all, color: 'text-slate-700 bg-slate-100' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-200/80 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    statusFilter === tab.id ? 'bg-white/20 text-white' : tab.color
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 text-xs">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600 text-sm">No Certified Hardcopy Requests Found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {statusFilter === 'PENDING'
                  ? 'All certified records have been processed and stamped.'
                  : 'No customer requests match your current search filter.'}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isUpdating = updatingId === req.id;
              const formattedDate = new Date(req.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-2xl border transition shadow-2xs space-y-3 ${
                    req.status === 'PENDING'
                      ? 'border-amber-200 bg-amber-50/20'
                      : req.status === 'READY_FOR_PICKUP'
                      ? 'border-emerald-200 bg-emerald-50/15'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Top Row: ID, Purpose & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-orange-600 text-xs px-2.5 py-0.5 rounded-md bg-orange-50 border border-orange-200">
                        #{req.id}
                      </span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {req.purpose || 'Official Certified Vehicle Record'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        • Requested {formattedDate}
                      </span>
                    </div>

                    <div>
                      {req.status === 'PENDING' ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending Stamp & Sign</span>
                        </span>
                      ) : req.status === 'READY_FOR_PICKUP' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Ready for Pickup at Front Desk</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 flex items-center gap-1 w-fit">
                          <Check className="w-3 h-3 text-slate-500" />
                          <span>Claimed by Rider</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rider & Motorcycle Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Rider Customer</span>
                      <span className="font-bold text-slate-900 block truncate">{req.customerName}</span>
                      {req.customerPhone && (
                        <span className="text-[11px] text-slate-500 block">{req.customerPhone}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Motorcycle Unit</span>
                      <span className="font-bold text-slate-900 block truncate">{req.bikeModel}</span>
                      <span className="font-mono text-[11px] text-slate-600 block">{req.plateNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery / Hub</span>
                      <span className="font-semibold text-slate-700 block">Santa Maria Front Desk</span>
                      <span className="text-[11px] text-emerald-600 font-medium">Free Official Service</span>
                    </div>
                  </div>

                  {req.notes && (
                    <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <span className="font-bold text-slate-700">Rider Note:</span> {req.notes}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handlePrintCertificate(req)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Print official stamped certificate"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Print Certificate</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {req.status === 'PENDING' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(req, 'READY_FOR_PICKUP')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <Stamp className="w-3.5 h-3.5" />
                          <span>Sign & Mark Ready for Pickup</span>
                        </button>
                      )}

                      {req.status === 'READY_FOR_PICKUP' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(req, 'CLAIMED')}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark as Claimed at Counter</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authorized by {currentStaffName} • Santa Maria Hub, Bulacan</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* HIDDEN PRINT-ONLY OFFICIAL CERTIFIED SERVICE RECORD PREVIEW */}
      {printableRequest && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 font-sans text-black z-9999">
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <h1 className="text-2xl font-black uppercase tracking-tight">MotoCare Workshop & Service Center</h1>
            <p className="text-xs">Santa Maria Hub, Bulacan • Phone: +63 985 245 5897</p>
            <h2 className="text-base font-bold uppercase tracking-wider mt-3 underline">
              Official Certified Vehicle Maintenance Record
            </h2>
            <p className="text-[11px] text-slate-600">Reference #{printableRequest.id}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border border-black p-4 mb-6 text-xs">
            <div>
              <p><strong>Customer / Owner:</strong> {printableRequest.customerName}</p>
              <p><strong>Contact Number:</strong> {printableRequest.customerPhone || 'N/A'}</p>
              <p><strong>Purpose of Record:</strong> {printableRequest.purpose}</p>
            </div>
            <div>
              <p><strong>Motorcycle Model:</strong> {printableRequest.bikeModel}</p>
              <p><strong>Plate / MV File Number:</strong> {printableRequest.plateNumber}</p>
              <p><strong>Date Issued:</strong> {new Date().toLocaleDateString('en-US')}</p>
            </div>
          </div>

          <div className="border border-black p-4 mb-8 text-xs leading-relaxed">
            <p className="font-bold mb-2">Certification of Workshop Maintenance:</p>
            <p>
              This certifies that the motorcycle unit described above is registered in the official MotoCare
              Workshop Management System. All diagnostic inspections, component torquing, fluids replacement,
              and safety tests have been performed in accordance with manufacturer technical specifications
              and standard multi-point quality assurance protocols.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-12 text-xs">
            <div className="text-center border-t border-black pt-2">
              <p className="font-bold">{currentStaffName}</p>
              <p className="text-[11px] text-slate-600">Lead Technician / Service Advisor</p>
            </div>
            <div className="text-center border-t border-black pt-2">
              <p className="font-bold">[ OFFICIAL MOTOCARE STAMP ]</p>
              <p className="text-[11px] text-slate-600">Authorized Workshop Seal</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
