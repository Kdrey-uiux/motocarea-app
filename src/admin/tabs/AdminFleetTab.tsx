import { useState, useMemo } from 'react';
import { AdminTicket } from '../../types/admin';
import { 
  Bike, 
  Search, 
  User, 
  Phone, 
  Calendar, 
  Gauge
} from 'lucide-react';

interface FleetBike {
  id: string;
  model: string;
  plate_number: string;
  year_model: string;
  odometer: string;
  owner_name: string;
  owner_phone: string;
  owner_id?: string;
  ticketsCount: number;
  lastService?: string;
  lastServiceType?: string;
}

interface AdminFleetTabProps {
  tickets: AdminTicket[];
  onSelectTicket?: (ticket: AdminTicket) => void;
}

export default function AdminFleetTab({ tickets }: AdminFleetTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique motorcycles from tickets and existing records
  const fleet: FleetBike[] = useMemo(() => {
    const map = new Map<string, FleetBike>();

    tickets.forEach((t) => {
      const bike = t.motorcycles;
      if (!bike) return;

      const plate = (bike.plate_number || 'UNKNOWN').toUpperCase();
      const existing = map.get(plate);

      const customerName = t.profiles?.full_name || t.customer_name || 'Rider Member';
      const customerPhone = t.profiles?.phone_number || t.customer_phone || 'N/A';

      if (!existing) {
        map.set(plate, {
          id: bike.id || plate,
          model: bike.model || 'Motorcycle Unit',
          plate_number: plate,
          year_model: bike.year_model || '2024',
          odometer: bike.odometer || '0 km',
          owner_name: customerName,
          owner_phone: customerPhone,
          owner_id: t.user_id,
          ticketsCount: 1,
          lastService: t.dropoff_date || t.created_at?.slice(0, 10),
          lastServiceType: t.service_type,
        });
      } else {
        existing.ticketsCount += 1;
      }
    });

    return Array.from(map.values());
  }, [tickets]);

  const filteredFleet = useMemo(() => {
    if (!searchQuery.trim()) return fleet;
    const q = searchQuery.toLowerCase();
    return fleet.filter(
      (b) =>
        b.plate_number.toLowerCase().includes(q) ||
        b.model.toLowerCase().includes(q) ||
        b.owner_name.toLowerCase().includes(q) ||
        b.owner_phone.toLowerCase().includes(q)
    );
  }, [fleet, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bike className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Customer Fleet & Motorcycle Directory</h2>
          </div>
          <p className="text-xs text-slate-500">
            Registered customer units, maintenance service counts, and ownership records.
          </p>
        </div>

        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500">Fleet Units: </span>
          <span className="font-bold text-slate-900 text-sm">{fleet.length}</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fleet by Plate Number, Motorcycle Model, or Owner Name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
          />
        </div>
      </div>

      {/* Grid of Bikes */}
      {filteredFleet.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-500 text-xs shadow-xs">
          Walang motor sa fleet directory na tumutugma sa filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFleet.map((bike) => (
            <div
              key={bike.plate_number}
              className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 space-y-4 shadow-xs transition"
            >
              {/* Bike Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{bike.model}</h3>
                  <div className="font-mono text-xs font-bold text-blue-700 mt-0.5">
                    {bike.plate_number}
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {bike.ticketsCount} {bike.ticketsCount === 1 ? 'Visit' : 'Visits'}
                </span>
              </div>

              {/* Owner Details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{bike.owner_name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{bike.owner_phone}</span>
                </div>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3 h-3 text-emerald-600" />
                  <span>Odo: {bike.odometer}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-purple-600" />
                  <span>Year: {bike.year_model}</span>
                </div>
              </div>

              {/* Last Service */}
              {bike.lastServiceType && (
                <div className="text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Latest Visit</div>
                  <div className="font-medium truncate text-blue-700 mt-0.5">
                    {bike.lastServiceType}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Date: {bike.lastService}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
