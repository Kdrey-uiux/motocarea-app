import { useState, useMemo } from 'react';
import { HardcopyRequest, updateHardcopyStatus } from '../../lib/hardcopyService';
import { db } from '../../lib/supabase';
import { PrintPreviewModal } from '../../components/print/PrintTemplate';
import { CertifiedRecordDocument, type PrintServiceRow } from '../../components/print/MotoCareDocuments';
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
} from '../../components/icons';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

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
  // Open on the tab that has work in it: pending first, then ready for pickup, else everything
  const pickStartTab = (): 'ALL' | 'PENDING' | 'READY_FOR_PICKUP' => {
    if (requests.some((r) => r.status === 'PENDING')) return 'PENDING';
    if (requests.some((r) => r.status === 'READY_FOR_PICKUP')) return 'READY_FOR_PICKUP';
    return 'ALL';
  };
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'READY_FOR_PICKUP' | 'CLAIMED'>(pickStartTab);
  // Each time the modal opens, start again on the tab with work in it
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setStatusFilter(pickStartTab());
      setSearchQuery('');
    }
  }
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [printableRequest, setPrintableRequest] = useState<HardcopyRequest | null>(null);
  const [printableRows, setPrintableRows] = useState<PrintServiceRow[] | null>(null);

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

  // Opens a preview of the certified record, with the motorcycle's completed services listed
  const handlePrintCertificate = async (req: HardcopyRequest) => {
    setPrintableRequest(req);
    setPrintableRows(null);
    const { data, error } = await db()
      .from('service_tickets')
      .select(
        'id, ticket_code, service_type, status, created_at, updated_at, paid_at, dropoff_date, assigned_bay, assigned_mechanic, motorcycles!inner(model, plate_number)'
      )
      .eq('user_id', req.userId)
      .eq('status', 'COMPLETED')
      .eq('motorcycles.plate_number', req.plateNumber)
      .order('created_at', { ascending: true });
    if (error) console.error('Failed to load service history for certificate:', error);
    setPrintableRows((data || []) as unknown as PrintServiceRow[]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <ScrollLock />
      <div className="bg-white text-slate-800 w-full max-w-3xl rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Stamp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                Hardcopy requests
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 truncate">
                Stamped and signed service records that customers asked for.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs + search */}
        <div className="mt-4 border-b border-slate-200/80">
          <nav className="flex items-center gap-5 overflow-x-auto px-5 sm:px-6 -mb-px [scrollbar-width:none]" aria-label="Request status">
            {[
              { id: 'PENDING', label: 'To sign', count: counts.pending, alert: counts.pending > 0 },
              { id: 'READY_FOR_PICKUP', label: 'Ready for pickup', count: counts.ready },
              { id: 'CLAIMED', label: 'Claimed', count: counts.claimed },
              { id: 'ALL', label: 'All', count: counts.all },
            ].map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                  className={`flex items-center gap-2 py-3 border-b-2 text-sm whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`min-w-[22px] px-1.5 rounded-md text-xs font-semibold leading-5 text-center tabular-nums ${
                      tab.alert ? 'bg-amber-100 text-amber-800' : isSelected ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="px-5 sm:px-6 py-3 bg-slate-50/70 border-b border-slate-200/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, plate, request ID or purpose"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder:not-italic placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
            />
          </div>
        </div>

        {/* Requests */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/40">
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-900 text-sm mt-4">
                {searchQuery.trim()
                  ? 'No requests match your search'
                  : {
                      PENDING: 'No requests waiting for signature',
                      READY_FOR_PICKUP: 'Nothing waiting for pickup',
                      CLAIMED: 'No claimed copies yet',
                      ALL: 'No hardcopy requests yet',
                    }[statusFilter]}
              </p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery.trim()
                  ? 'Try a different name, plate or request ID.'
                  : {
                      PENDING: 'New customer requests show up here for stamping and sign-off.',
                      READY_FOR_PICKUP: 'Signed copies waiting at the front desk show up here.',
                      CLAIMED: 'Copies the customer has picked up show up here.',
                      ALL: 'Customers can request a certified copy from their Service Records page.',
                    }[statusFilter]}
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
              const status =
                req.status === 'PENDING'
                  ? { label: 'To sign', icon: Clock, className: 'bg-amber-50 text-amber-800 border-amber-200' }
                  : req.status === 'READY_FOR_PICKUP'
                  ? { label: 'Ready for pickup', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
                  : { label: 'Claimed', icon: Check, className: 'bg-slate-100 text-slate-600 border-slate-200' };

              return (
                <div key={req.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 shadow-2xs">
                  {/* Purpose, ID, date and status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold tracking-tight text-slate-900 leading-snug">
                        {req.purpose || 'Official certified vehicle record'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-mono font-semibold text-orange-600">#{req.id}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        Requested {formattedDate}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 shrink-0 ${status.className}`}>
                      <status.icon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                  </div>

                  {/* Customer, motorcycle, pickup */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="min-w-0">
                      <span className="text-xs text-slate-500 block">Customer</span>
                      <span className="font-semibold text-slate-900 block truncate">{req.customerName}</span>
                      {req.customerPhone && <span className="text-xs text-slate-500 block">{req.customerPhone}</span>}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-slate-500 block">Motorcycle</span>
                      <span className="font-semibold text-slate-900 block truncate" title={req.bikeModel}>{req.bikeModel}</span>
                      <span className="font-mono text-xs text-slate-500 block">{req.plateNumber}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-slate-500 block">Pickup</span>
                      <span className="font-semibold text-slate-900 block">Santa Maria front desk</span>
                      <span className="text-xs text-slate-500 block">No charge</span>
                    </div>
                  </div>

                  {req.notes && (
                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                      <span className="font-semibold text-slate-800">Customer note:</span> {req.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handlePrintCertificate(req)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                      title="Print the certificate"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Print certificate</span>
                    </button>

                    {req.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(req, 'READY_FOR_PICKUP')}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Stamp className="w-4 h-4" />
                        <span>{isUpdating ? 'Saving...' : 'Sign & mark ready'}</span>
                      </button>
                    )}

                    {req.status === 'READY_FOR_PICKUP' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(req, 'CLAIMED')}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isUpdating ? 'Saving...' : 'Mark as claimed'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Signed by {currentStaffName} · Santa Maria, Bulacan</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition cursor-pointer shrink-0"
          >
            Close
          </button>
        </div>
      </div>

      {/* Certified record preview (shared print template); shown once its service history has loaded */}
      {printableRequest && printableRows && (
        <PrintPreviewModal
          title="Certified maintenance record"
          description={`${printableRequest.id} · ${printableRequest.customerName} · ${printableRequest.plateNumber}`}
          printLabel="Print record"
          onClose={() => {
            setPrintableRequest(null);
            setPrintableRows(null);
          }}
        >
          <CertifiedRecordDocument request={printableRequest} rows={printableRows} certifiedBy={currentStaffName} />
        </PrintPreviewModal>
      )}
    </div>
  );
}
