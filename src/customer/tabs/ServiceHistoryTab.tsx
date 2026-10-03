import { useState, useMemo } from 'react';
import { ServiceTicket, UserProfile, TabType } from '../../types/dashboard';
import RequestHardcopyModal from '../modals/RequestHardcopyModal';
import { HardcopyRequest } from '../../lib/hardcopyService';
import {
  Inbox,
  CheckCircle2,
  Printer,
  Search,
  FileText,
  X,
  Wrench,
  Bike,
  Calendar,
  ShieldCheck,
  Stamp,
  Clock,
  MapPin
} from 'lucide-react';

interface ServiceHistoryTabProps {
  serviceHistory: ServiceTicket[];
  userProfile: UserProfile | null;
  userId?: string | null;
  onNavigateTab?: (tab: TabType) => void;
  onOpenHelpdesk?: () => void;
  hardcopyRequests?: HardcopyRequest[];
  onRefreshHardcopy?: () => void;
}

export default function ServiceHistoryTab({
  serviceHistory,
  userProfile,
  userId,
  onNavigateTab,
  onOpenHelpdesk,
  hardcopyRequests = [],
  onRefreshHardcopy,
}: ServiceHistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [selectedBikePlate, setSelectedBikePlate] = useState<string>('all');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const latestActiveHardcopy = useMemo(() => {
    if (!hardcopyRequests || hardcopyRequests.length === 0) return null;
    return (
      hardcopyRequests.find(
        (r) => r.status === 'READY_FOR_PICKUP' || r.status === 'PENDING'
      ) || null
    );
  }, [hardcopyRequests]);

  // Extract all unique motorcycles from service history for vehicle filtering
  const uniqueBikes = useMemo(() => {
    const map = new Map<string, { model: string; plate_number: string }>();
    serviceHistory.forEach((item) => {
      if (item.motorcycles?.plate_number) {
        map.set(item.motorcycles.plate_number, {
          model: item.motorcycles.model || 'Motorcycle Unit',
          plate_number: item.motorcycles.plate_number,
        });
      }
    });
    return Array.from(map.values());
  }, [serviceHistory]);

  const activeSelectedBike = useMemo(() => {
    if (selectedBikePlate === 'all') return null;
    return uniqueBikes.find((b) => b.plate_number.toLowerCase() === selectedBikePlate.toLowerCase()) || null;
  }, [selectedBikePlate, uniqueBikes]);

  const filteredHistory = useMemo(() => {
    return serviceHistory.filter((item) => {
      const matchesBike =
        selectedBikePlate === 'all' ||
        item.motorcycles?.plate_number?.toLowerCase() === selectedBikePlate.toLowerCase();

      if (!matchesBike) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        item.ticket_code.toLowerCase().includes(q) ||
        (item.motorcycles?.model && item.motorcycles.model.toLowerCase().includes(q)) ||
        (item.motorcycles?.plate_number && item.motorcycles.plate_number.toLowerCase().includes(q)) ||
        item.service_type.toLowerCase().includes(q) ||
        (item.assigned_mechanic && item.assigned_mechanic.toLowerCase().includes(q))
      );
    });
  }, [serviceHistory, selectedBikePlate, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* =========================================================================
          SCREEN UI (Hidden when printing to ensure a 100% clean paper document)
         ========================================================================= */}
      <div className="print:hidden space-y-4 sm:space-y-5">
        {/* 1. Header Hero Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              Service History & Records
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Official completed maintenance logs verified by MotoCare workshop technicians.
            </p>
          </div>

          {serviceHistory.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
                title="Request official certified hardcopy with workshop dry seal and Lead Tech sign-off"
              >
                <Stamp className="w-3.5 h-3.5 text-orange-500" />
                <span>Request Certified Hardcopy</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm shadow-orange-500/20 transition cursor-pointer"
                title={
                  activeSelectedBike
                    ? `Print official history for ${activeSelectedBike.model}`
                    : 'Print complete fleet service history'
                }
              >
                <Printer className="w-3.5 h-3.5" />
                <span>
                  {activeSelectedBike
                    ? `Print (${activeSelectedBike.plate_number})`
                    : 'Print / PDF'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Live Hardcopy Request Status Banner */}
        {latestActiveHardcopy && (
          <div
            className={`rounded-2xl p-4 sm:p-4.5 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs transition animate-in fade-in duration-200 ${
              latestActiveHardcopy.status === 'READY_FOR_PICKUP'
                ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-amber-50/90 border-amber-300'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                  latestActiveHardcopy.status === 'READY_FOR_PICKUP'
                    ? 'bg-emerald-600 text-white animate-bounce'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {latestActiveHardcopy.status === 'READY_FOR_PICKUP' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5 animate-spin" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">
                    {latestActiveHardcopy.status === 'READY_FOR_PICKUP'
                      ? 'Certified Hardcopy Ready for Pickup!'
                      : 'Preparing Certified Hardcopy'}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                      latestActiveHardcopy.status === 'READY_FOR_PICKUP'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    REF #{latestActiveHardcopy.id}
                  </span>
                </div>

                <p className="text-slate-600 text-xs">
                  Motorcycle:{' '}
                  <span className="font-bold text-slate-900">
                    {latestActiveHardcopy.bikeModel}
                  </span>{' '}
                  ({latestActiveHardcopy.plateNumber}) • Purpose:{' '}
                  <span className="font-medium text-slate-800">
                    {latestActiveHardcopy.purpose}
                  </span>
                </p>

                {latestActiveHardcopy.status === 'READY_FOR_PICKUP' ? (
                  <p className="text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Printed, signed by Lead Tech, and dry-stamped! Please claim at Santa Maria Main Workshop Front Desk reception.
                    </span>
                  </p>
                ) : (
                  <p className="text-amber-800 text-[11px] font-medium pt-0.5">
                    Our Service Advisor and Lead Technician are preparing and certifying your physical copy. You will receive an instant notification once ready.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {latestActiveHardcopy.status === 'READY_FOR_PICKUP' && onOpenHelpdesk && (
                <button
                  type="button"
                  onClick={onOpenHelpdesk}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Contact Desk
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2. Quick Summary Stats Bar (No more 'Primary' label!) */}
        {serviceHistory.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">
                Completed Services
              </span>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                {filteredHistory.length} {filteredHistory.length === 1 ? 'Record' : 'Records'}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {selectedBikePlate === 'all'
                  ? 'All Fleet Units Verified'
                  : `Filtered for ${activeSelectedBike?.model || 'Unit'}`}
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">
                Serviced Garage Fleet
              </span>
              <div className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {selectedBikePlate === 'all'
                  ? `${uniqueBikes.length} ${uniqueBikes.length === 1 ? 'Motorcycle' : 'Motorcycles'}`
                  : activeSelectedBike?.model || 'Motorcycle'}
              </div>
              <span className="text-[11px] font-mono text-slate-500 block truncate">
                {selectedBikePlate === 'all'
                  ? uniqueBikes.map((b) => b.plate_number).join(' • ') || 'Fleet Units'
                  : activeSelectedBike?.plate_number || 'Selected Vehicle'}
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">
                Latest Completed Service
              </span>
              <div className="text-base sm:text-lg font-bold text-slate-900">
                {filteredHistory[0]
                  ? new Date(filteredHistory[0].created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'None Yet'}
              </div>
              <span className="text-[11px] text-slate-500 truncate block">
                {filteredHistory[0]?.service_type || 'Preventive Maintenance'}
              </span>
            </div>
          </div>
        )}

        {/* 3. Vehicle Filter Selector (Allows filtering & printing a specific bike like Yamaha Mio i 125!) */}
        {uniqueBikes.length > 1 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-orange-500" />
                <span>Select Motorcycle to View or Print:</span>
              </span>
              {activeSelectedBike && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Showing {filteredHistory.length} logs for {activeSelectedBike.plate_number}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
              <button
                type="button"
                onClick={() => setSelectedBikePlate('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                  selectedBikePlate === 'all'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
              >
                All Vehicles ({serviceHistory.length})
              </button>

              {uniqueBikes.map((bike) => {
                const isSelected = selectedBikePlate.toLowerCase() === bike.plate_number.toLowerCase();
                const bikeCount = serviceHistory.filter(
                  (t) => t.motorcycles?.plate_number?.toLowerCase() === bike.plate_number.toLowerCase()
                ).length;

                return (
                  <button
                    key={bike.plate_number}
                    type="button"
                    onClick={() => setSelectedBikePlate(bike.plate_number)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    <span>{bike.model}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-orange-600 text-white' : 'bg-slate-200/70 text-slate-600'
                      }`}
                    >
                      {bike.plate_number} ({bikeCount})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Compact Search Input */}
        {serviceHistory.length > 0 && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket code (e.g. MC-9113), plate, or service type..."
              className="w-full bg-white border border-slate-200/80 rounded-full pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 shadow-xs transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* 5. Data Records View (Empty State or Records Table) */}
        {serviceHistory.length === 0 ? (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-6 sm:p-10 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center mx-auto text-orange-600 shadow-xs">
                <Inbox className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="text-base font-bold text-slate-900">No Past Service Records Yet</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Once your ongoing service ticket is marked as completed by the mechanic, official logs and downloadable receipts will appear here automatically.
                </p>
              </div>

              {onNavigateTab && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('book')}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-full py-2.5 px-6 font-semibold text-xs inline-flex items-center gap-2 shadow-sm shadow-orange-500/20 transition cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book a Service Appointment</span>
                  </button>
                </div>
              )}
            </div>

            {/* Helpful Bento Information Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-1.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Official Workshop Log</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  All maintenance records are recorded directly from your workshop technician's release clearance.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-1.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Printable Official Slips</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Generate verified maintenance slips anytime for insurance compliance or motorcycle resale records.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-1.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Helpdesk Support</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Need a stamped certified copy of your records? Inquire directly with our Service Advisor anytime.
                </p>
              </div>
            </div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-8 text-center text-xs text-slate-500 shadow-xs">
            No service records matching your search or vehicle filter.
          </div>
        ) : (
          <>
            {/* Mobile Card List (< sm screens) */}
            <div className="sm:hidden space-y-3">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-orange-600 bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded-lg text-xs">
                      #{item.ticket_code}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {item.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="font-bold text-sm text-slate-900">{item.service_type}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Bike className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {item.motorcycles?.model || 'Motorcycle'} ({item.motorcycles?.plate_number || 'N/A'})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Date Completed</span>
                      <span className="font-medium text-slate-800">
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Amount Paid</span>
                      <span className="font-bold text-slate-900">{item.total_estimate}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTicket(item)}
                    className="w-full py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/80 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Official Slip</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= sm screens) */}
            <div className="hidden sm:block bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 whitespace-nowrap">Ticket</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Date Completed</th>
                      <th className="py-3.5 px-4">Motorcycle Unit</th>
                      <th className="py-3.5 px-4">Work Rendered</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Lead Mechanic</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Amount Paid</th>
                      <th className="py-3.5 px-4 whitespace-nowrap text-center">Status</th>
                      <th className="py-3.5 px-4 whitespace-nowrap text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-orange-600 bg-orange-50 border border-orange-200/80 px-2.5 py-1 rounded-lg text-xs inline-block">
                            #{item.ticket_code}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-600">
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4 min-w-[180px]">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <Bike className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.motorcycles?.model || 'Motorcycle Unit'}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono font-medium block pl-5">
                            {item.motorcycles?.plate_number || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4 min-w-[200px] text-slate-600 font-medium">
                          {item.service_type}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-slate-700">
                          <span className="font-medium">{item.assigned_mechanic}</span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 text-xs">
                            {item.total_estimate}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTicket(item)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 px-3.5 py-1.5 rounded-full transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Slip</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* =========================================================================
          DEDICATED PRINT-ONLY OFFICIAL SERVICE HISTORY DOCUMENT
          (Anchored at bottom, unified clean typography, no double-hash, no font glitches)
         ========================================================================= */}
      {!selectedTicket && (
        <div className="hidden print:block print-document text-slate-900 bg-white p-0">
          {/* Top Section: Letterhead, Customer Box, and Maintenance Table */}
          <div className="print-body space-y-3.5">
            {/* Official Letterhead Header */}
            <div className="border-b-2 border-slate-900 pb-2.5 flex items-start justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                    MC
                  </div>
                  <h1 className="text-[12pt] font-extrabold uppercase tracking-wide text-slate-900">
                    MotoCare Workshop & Service Hub
                  </h1>
                </div>
                <p className="text-[8.5pt] text-slate-600">
                  Santa Maria Service Branch • Bulacan, Philippines • Contact: (044) 791-MOTO
                </p>
                <p className="text-[7.5pt] text-slate-500 font-mono">
                  Official Vehicle Preventive Maintenance Registry
                </p>
              </div>

              <div className="text-right space-y-0.5">
                <span className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-500 block">
                  Official Document
                </span>
                <div className="text-[9.5pt] font-bold text-slate-900 uppercase">
                  {activeSelectedBike
                    ? `Service Record: ${activeSelectedBike.model}`
                    : 'Fleet Service History Ledger'}
                </div>
                <div className="text-[8pt] text-slate-600">
                  Date Printed: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Customer & Target Vehicle Information Box */}
            <div className="border border-slate-300 rounded p-2.5 bg-slate-50/70 grid grid-cols-2 gap-4 text-[8.5pt]">
              <div>
                <span className="text-[7pt] font-bold text-slate-500 uppercase tracking-wider block">
                  Customer Name / Account
                </span>
                <span className="font-bold text-slate-900 text-[9.5pt] block capitalize">
                  {userProfile?.full_name || 'Rider Customer'}
                </span>
                <span className="text-slate-600 text-[8pt] block mt-0.5">
                  Contact: {userProfile?.phone_number || 'N/A'} • {userProfile?.email || ''}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[7pt] font-bold text-slate-500 uppercase tracking-wider block">
                  Vehicle Coverage
                </span>
                <span className="font-bold text-slate-900 text-[9.5pt] block">
                  {activeSelectedBike
                    ? `${activeSelectedBike.model} (${activeSelectedBike.plate_number})`
                    : `All Registered Fleet Units (${uniqueBikes.length} Motorcycles)`}
                </span>
                <span className="text-slate-600 text-[8pt] block mt-0.5">
                  Total Logs Printed: {filteredHistory.length} completed {filteredHistory.length === 1 ? 'service' : 'services'}
                </span>
              </div>
            </div>

            {/* Official Maintenance Table (Tight, Proportional, No Wrapping Bugs) */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left border-collapse" style={{ fontSize: '8.5pt' }}>
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[7.5pt]">
                    <th className="py-2 px-2.5 border-r border-slate-300 whitespace-nowrap" style={{ width: '15%' }}>
                      Ticket Ref
                    </th>
                    <th className="py-2 px-2.5 border-r border-slate-300 whitespace-nowrap" style={{ width: '14%' }}>
                      Date Done
                    </th>
                    <th className="py-2 px-2.5 border-r border-slate-300" style={{ width: '26%' }}>
                      Motorcycle Unit
                    </th>
                    <th className="py-2 px-2.5 border-r border-slate-300" style={{ width: '24%' }}>
                      Work Rendered
                    </th>
                    <th className="py-2 px-2.5 border-r border-slate-300 whitespace-nowrap" style={{ width: '11%' }}>
                      Lead Mechanic
                    </th>
                    <th className="py-2 px-2.5 text-right whitespace-nowrap" style={{ width: '10%' }}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {filteredHistory.map((item) => {
                    const cleanRef = item.ticket_code.replace(/^#+/, '');
                    const mechanicName =
                      item.assigned_mechanic && item.assigned_mechanic !== 'Queued for Assignment'
                        ? item.assigned_mechanic
                        : 'Workshop Tech';

                    return (
                      <tr key={item.id}>
                        <td className="py-1.5 px-2.5 border-r border-slate-300 font-mono font-bold whitespace-nowrap">
                          #{cleanRef}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-300 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-300">
                          <div className="font-bold leading-tight text-slate-900">
                            {item.motorcycles?.model || 'Motorcycle Unit'}
                          </div>
                          <div className="text-[7.5pt] text-slate-600 font-mono mt-0.5">
                            {item.motorcycles?.plate_number || 'N/A'}
                          </div>
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-300 leading-tight">
                          {item.service_type}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-300 whitespace-nowrap">
                          {mechanicName}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold whitespace-nowrap">
                          {item.total_estimate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-300 font-bold text-[8.5pt]">
                    <td colSpan={5} className="py-2 px-2.5 text-right uppercase text-slate-600 border-r border-slate-300">
                      Total Records Logged:
                    </td>
                    <td className="py-2 px-2.5 text-right text-slate-900 font-bold whitespace-nowrap">
                      {filteredHistory.length} {filteredHistory.length === 1 ? 'Job' : 'Jobs'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Bottom Section: Verification & Sign-off Footer */}
          <div className="print-footer pt-3 border-t border-slate-300 grid grid-cols-12 gap-6 text-[8pt] items-end mt-6">
            <div className="col-span-7">
              <p className="text-slate-500 leading-relaxed text-[7.5pt]">
                This document is an authentic certified record of preventive maintenance, mechanical service, and certified fluids replacement conducted at MotoCare Workshop & Service Hub. Valid for warranty documentation and motorcycle resale valuation.
              </p>
            </div>

            <div className="col-span-5 flex justify-end gap-6 text-center">
              <div className="space-y-1">
                <div className="w-28 sm:w-32 border-b border-slate-400 pb-1 font-bold text-slate-900 text-[8.5pt]">
                  Service Desk
                </div>
                <span className="text-[7pt] text-slate-500 block uppercase font-medium">
                  Prepared & Certified By
                </span>
              </div>
              <div className="space-y-1">
                <div className="w-28 sm:w-32 border-b border-slate-400 pb-1 font-bold text-slate-900 text-[8.5pt]">
                  Lead Technician
                </div>
                <span className="text-[7pt] text-slate-500 block uppercase font-medium">
                  Verified Technical Staff
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SLIP MODAL (Prints cleanly as a receipt if opened)
         ========================================================================= */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
          <div className="print-slip-modal bg-white border border-slate-200 rounded-[2rem] max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:border-b-2 print:border-slate-900">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Official Service Slip</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    TICKET REF: #{selectedTicket.ticket_code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 print-hide cursor-pointer"
                title="Close Slip"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 font-sans print:bg-white print:border print:border-slate-300">
              <div className="text-center pb-2 border-b border-dashed border-slate-200">
                <div className="font-bold text-slate-900 text-sm">MotoCare Workshop Dispatch</div>
                <div className="text-[11px] text-slate-500">Santa Maria Service Hub • Bulacan</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">
                  OFFICIAL COMPLETED SERVICE RECORD
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">CUSTOMER NAME</span>
                  <span className="font-bold text-slate-800">{userProfile?.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">CONTACT NO.</span>
                  <span className="text-slate-800 font-semibold">{userProfile?.phone_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">MOTORCYCLE UNIT</span>
                  <span className="font-bold text-slate-800">
                    {selectedTicket.motorcycles?.model || 'Motorcycle'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PLATE / MV FILE</span>
                  <span className="font-bold text-slate-800">
                    {selectedTicket.motorcycles?.plate_number || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold">SERVICE RENDERED</div>
                <div className="font-bold text-slate-900 text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                  {selectedTicket.service_type}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">SERVICE BAY</span>
                  <span className="font-semibold text-slate-800">{selectedTicket.assigned_bay}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">LEAD MECHANIC</span>
                  <span className="font-semibold text-orange-600">{selectedTicket.assigned_mechanic}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">TOTAL AMOUNT PAID:</span>
                <span className="text-base font-extrabold text-emerald-600">
                  {selectedTicket.total_estimate}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 print-hide">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Certified Hardcopy Modal */}
      <RequestHardcopyModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        userId={userId || null}
        userProfile={userProfile}
        uniqueBikes={uniqueBikes}
        initialBikePlate={selectedBikePlate}
        onSuccess={() => {
          if (onRefreshHardcopy) onRefreshHardcopy();
        }}
      />
    </div>
  );
}
