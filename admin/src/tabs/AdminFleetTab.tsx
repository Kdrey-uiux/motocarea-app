import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AdminTicket } from '../types/admin';
import { 
  Bike, 
  Search, 
  User, 
  Phone, 
  Calendar, 
  Gauge,
  RefreshCw
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
  const [dbBikes, setDbBikes] = useState<any[]>([]);
  const [dbProfiles, setDbProfiles] = useState<Map<string, { full_name: string; phone_number: string }>>(new Map());
  const [loadingBikes, setLoadingBikes] = useState(false);

  const fetchDatabaseBikes = async () => {
    setLoadingBikes(true);
    try {
      const { data: bikes } = await supabase
        .from('motorcycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (bikes && bikes.length > 0) {
        setDbBikes(bikes);
        const uids = Array.from(new Set(bikes.map((b) => b.user_id).filter(Boolean)));
        if (uids.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, phone_number')
            .in('id', uids);
          if (profs) {
            const pMap = new Map<string, { full_name: string; phone_number: string }>();
            profs.forEach((p) => pMap.set(p.id, { full_name: p.full_name || 'Rider Customer', phone_number: p.phone_number || 'N/A' }));
            setDbProfiles(pMap);
          }
        }
      }
    } catch (err) {
      console.error('Fleet bikes fetch error:', err);
    } finally {
      setLoadingBikes(false);
    }
  };

  useEffect(() => {
    fetchDatabaseBikes();
  }, []);

  // Merge database bikes with ticket records
  const fleet: FleetBike[] = useMemo(() => {
    const map = new Map<string, FleetBike>();

    // 1. Seed from registered database motorcycles
    dbBikes.forEach((b) => {
      const plate = (b.plate_number || 'UNKNOWN').toUpperCase();
      const prof = b.user_id ? dbProfiles.get(b.user_id) : undefined;
      map.set(plate, {
        id: b.id,
        model: b.model || 'Motorcycle Unit',
        plate_number: plate,
        year_model: b.year_model || '2024',
        odometer: b.odometer || '0 km',
        owner_name: prof?.full_name || 'Rider Member',
        owner_phone: prof?.phone_number || 'N/A',
        owner_id: b.user_id,
        ticketsCount: 0,
      });
    });

    // 2. Overlay / count from service tickets
    tickets.forEach((t) => {
      const bike = t.motorcycles;
      if (!bike) return;

      const plate = (bike.plate_number || 'UNKNOWN').toUpperCase();
      const customerName = t.profiles?.full_name || t.customer_name || 'Rider Member';
      const customerPhone = t.profiles?.phone_number || t.customer_phone || 'N/A';

      const existing = map.get(plate);
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
        if (!existing.lastService || (t.created_at && t.created_at > existing.lastService)) {
          existing.lastService = t.dropoff_date || t.created_at?.slice(0, 10);
          existing.lastServiceType = t.service_type;
        }
        if (existing.owner_name === 'Rider Member' && customerName !== 'Rider Member') {
          existing.owner_name = customerName;
        }
        if (existing.owner_phone === 'N/A' && customerPhone !== 'N/A') {
          existing.owner_phone = customerPhone;
        }
      }
    });

    return Array.from(map.values());
  }, [dbBikes, dbProfiles, tickets]);

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
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
              <Bike className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Customer Fleet & Motorcycle Directory</h2>
          </div>
          <p className="text-xs text-slate-500">
            Live database registered customer units, maintenance service counts, and ownership records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDatabaseBikes}
            disabled={loadingBikes}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition text-xs flex items-center gap-1.5"
            title="Refresh Fleet Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBikes ? 'animate-spin text-orange-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="bg-orange-50 px-4 py-2 rounded-xl border border-orange-200 text-xs text-orange-800">
            <span className="text-orange-600 font-medium">Registered Units: </span>
            <span className="font-bold text-orange-700 text-sm ml-1">{fleet.length}</span>
          </div>
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
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 transition"
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
              className="bg-white border border-slate-200/90 hover:border-orange-300 rounded-2xl p-5 space-y-4 shadow-xs transition group hover:shadow-md"
            >
              {/* Bike Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-orange-600 transition">{bike.model}</h3>
                  <div className="font-mono text-xs font-bold text-orange-600 mt-0.5">
                    {bike.plate_number}
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
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
                  <Calendar className="w-3 h-3 text-orange-500" />
                  <span>Year: {bike.year_model}</span>
                </div>
              </div>

              {/* Last Service */}
              {bike.lastServiceType && (
                <div className="text-[11px] bg-orange-50/50 p-2.5 rounded-lg border border-orange-100 text-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Latest Visit</div>
                  <div className="font-medium truncate text-orange-700 mt-0.5">
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
