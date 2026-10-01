import { useState } from 'react';
import { ServiceTicket, UserProfile } from '../../types/dashboard';
import {
  Inbox,
  CheckCircle2,
  Download,
  Printer,
  ShieldCheck,
  Search,
  FileText,
  X,
  Wrench,
  Bike
} from 'lucide-react';

interface ServiceHistoryTabProps {
  serviceHistory: ServiceTicket[];
  userProfile: UserProfile | null;
}

export default function ServiceHistoryTab({
  serviceHistory,
  userProfile,
}: ServiceHistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);

  const filteredHistory = serviceHistory.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.ticket_code.toLowerCase().includes(q) ||
      (item.motorcycles?.model && item.motorcycles.model.toLowerCase().includes(q)) ||
      (item.motorcycles?.plate_number && item.motorcycles.plate_number.toLowerCase().includes(q)) ||
      item.service_type.toLowerCase().includes(q)
    );
  });

  const exportToCSV = () => {
    if (serviceHistory.length === 0) return;

    const headers = [
      'Ticket Code',
      'Customer Name',
      'Contact Number',
      'Motorcycle Model',
      'Plate Number',
      'Service Rendered',
      'Assigned Bay',
      'Lead Mechanic',
      'Drop-off Date',
      'Date Completed',
      'Total Amount Paid',
      'Status',
      'Customer Notes'
    ];

    const rows = serviceHistory.map((ticket) => [
      `"${ticket.ticket_code}"`,
      `"${userProfile?.full_name || 'Rider Customer'}"`,
      `"${userProfile?.phone_number || 'N/A'}"`,
      `"${ticket.motorcycles?.model || 'N/A'}"`,
      `"${ticket.motorcycles?.plate_number || 'N/A'}"`,
      `"${ticket.service_type.replace(/"/g, '""')}"`,
      `"${ticket.assigned_bay || 'N/A'}"`,
      `"${ticket.assigned_mechanic || 'N/A'}"`,
      `"${ticket.dropoff_date || new Date(ticket.created_at).toLocaleDateString()}"`,
      `"${new Date(ticket.created_at).toLocaleDateString()}"`,
      `"${ticket.total_estimate}"`,
      `"${ticket.status}"`,
      `"${(ticket.notes || 'None').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      '\uFEFF' +
      [
        `"MOTOCARE WORKSHOP MANAGEMENT SYSTEM - OFFICIAL MAINTENANCE LOG"`,
        `"Exported Date:","${new Date().toLocaleString()}"`,
        `"Account Owner:","${userProfile?.full_name || 'Rider'}"`,
        `"Registered Contact:","${userProfile?.phone_number || 'N/A'}"`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(','))
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanDate = new Date().toISOString().split('T')[0];
    link.download = `MotoCare_Service_Ledger_${cleanDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Action & Export Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Audit Ledger</span>
          </span>
          <span className="text-xs text-slate-500">
            Tamper-proof maintenance records verified by workshop mechanics.
          </span>
        </div>

        {serviceHistory.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm shadow-orange-500/20 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Pill Search Input */}
      {serviceHistory.length > 0 && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticket code (e.g. MC-2326), motorcycle, or service type..."
            className="w-full bg-white border border-slate-200/80 rounded-full pl-10 pr-4 py-2.5 text-base sm:text-xs text-slate-800 focus:outline-none focus:border-orange-500 shadow-xs transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      )}

      {/* Data Records View (Responsive: Mobile Cards + Desktop Table) */}
      {serviceHistory.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-10 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-800">No Past Service Records Yet</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Once your ongoing service ticket is marked as completed by the mechanic, official logs and downloadable receipts will appear here.
          </p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-8 text-center text-xs text-slate-500">
          No records matching &quot;{searchQuery}&quot;.
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
                  <span className="font-semibold text-orange-600 bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded-lg text-xs">
                    {item.ticket_code}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    {item.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-900">{item.service_type}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Bike className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.motorcycles?.model || 'Motorcycle'} ({item.motorcycles?.plate_number || 'N/A'})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Date</span>
                    <span className="font-medium text-slate-800">{new Date(item.created_at).toLocaleDateString()}</span>
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
                        <span className="font-semibold text-orange-600 bg-orange-50 border border-orange-200/80 px-2.5 py-1 rounded-lg text-xs inline-block">
                          {item.ticket_code}
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap font-medium text-slate-600">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 min-w-[180px]">
                        <div className="font-semibold text-slate-900">
                          {item.motorcycles?.model || 'Motorcycle Unit'}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {item.motorcycles?.plate_number || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4 min-w-[200px] text-slate-600">
                        {item.service_type}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-slate-700 font-medium">
                        {item.assigned_mechanic}
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

      {/* Slip Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
          <div className="print-slip-modal bg-white border border-slate-200 rounded-[2rem] max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Official Service Slip</h3>
                  <p className="text-[10px] text-slate-400">
                    TICKET REF: {selectedTicket.ticket_code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 print-hide cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 font-sans">
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
    </div>
  );
}
