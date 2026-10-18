import { useState, useMemo, useEffect, useRef } from 'react';
import { db } from '../../lib/supabase';
import { InternalTicket } from '../types/internal';
import { getInternalSession } from '../utils/internalAuth';
import { 
  getCompleteMotorcycleCatalog, 
  OfficialBikeModel, 
  addOfficialCatalogModel, 
  toggleOfficialCatalogModelStatus 
} from '../../utils/motorcycleCatalog';
import { 
  Bike, 
  Search, 
  User, 
  Phone, 
  Gauge, 
  RefreshCw, 
  Plus, 
  History, 
  Loader2, 
  X, 
  CheckCircle2,
  BookOpen,
  Check,
  AlertCircle
} from 'lucide-react';
import VehicleHistoryModal from '../modals/VehicleHistoryModal';
import { toast } from '../utils/toast';

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
}

interface InternalFleetTabProps {
  tickets: InternalTicket[];
}

export default function InternalFleetTab({ tickets }: InternalFleetTabProps) {
  const session = getInternalSession();
  const isAdmin = session?.role === 'admin';

  // Sub-tab: 'fleet' (customer vehicles) or 'catalog' (official motorcycle models)
  const [subTab, setSubTab] = useState<'fleet' | 'catalog'>('fleet');

  // Fleet Sub-tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [dbBikes, setDbBikes] = useState<any[]>([]);
  const [dbProfiles, setDbProfiles] = useState<Map<string, { full_name: string; phone_number: string }>>(new Map());
  const [loadingBikes, setLoadingBikes] = useState(false);

  // History Modal State
  const [selectedVehicle, setSelectedVehicle] = useState<FleetBike | null>(null);

  // Register Vehicle Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regModel, setRegModel] = useState('');
  const [regPlate, setRegPlate] = useState('');
  const [regYear, setRegYear] = useState('2024');
  const [regOdometer, setRegOdometer] = useState('');
  const [registering, setRegistering] = useState(false);

  // Catalog Sub-tab state
  const [catalog, setCatalog] = useState<OfficialBikeModel[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');

  // Add Official Model Modal State (Admin-only)
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [newBrand, setNewBrand] = useState('Honda');
  const [newModelName, setNewModelName] = useState('');
  const [newCategory, setNewCategory] = useState('Scooter');
  const [newCc, setNewCc] = useState<number>(150);
  const [savingModel, setSavingModel] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelSuccess, setModelSuccess] = useState<string | null>(null);

  // Combobox state for register modal
  const [regDropdownOpen, setRegDropdownOpen] = useState(false);
  const regDropdownRef = useRef<HTMLDivElement>(null);

  const fetchDatabaseBikes = async () => {
    setLoadingBikes(true);
    try {
      const { data: bikes } = await db()
        .from('motorcycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (bikes && bikes.length > 0) {
        setDbBikes(bikes);
        const uids = Array.from(new Set(bikes.map((b) => b.user_id).filter(Boolean)));
        if (uids.length > 0) {
          const { data: profs } = await db()
            .from('profiles')
            .select('id, full_name, phone_number')
            .in('id', uids);
          if (profs) {
            const pMap = new Map<string, { full_name: string; phone_number: string }>();
            profs.forEach((p) =>
              pMap.set(p.id, {
                full_name: p.full_name || 'Rider Customer',
                phone_number: p.phone_number || 'N/A',
              })
            );
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

  const loadCatalogModels = async () => {
    setLoadingCatalog(true);
    try {
      const list = await getCompleteMotorcycleCatalog();
      setCatalog(list);
    } catch (err) {
      console.error('Catalog load error:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    fetchDatabaseBikes();
    loadCatalogModels();

    const handleCatalogUpdate = () => {
      loadCatalogModels();
    };
    window.addEventListener('motocare_catalog_updated', handleCatalogUpdate);
    return () => window.removeEventListener('motocare_catalog_updated', handleCatalogUpdate);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (regDropdownRef.current && !regDropdownRef.current.contains(event.target as Node)) {
        setRegDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPlate.trim() || !regModel.trim()) return;

    setRegistering(true);
    try {
      const cleanPlate = regPlate.trim().toUpperCase();
      const cleanModel = regModel.trim();

      await db().from('motorcycles').insert({
        plate_number: cleanPlate,
        model: cleanModel,
        year_model: regYear.trim() || '2024',
        odometer: regOdometer.trim() ? `${regOdometer.trim()} km` : '0 km',
      });

      setIsRegisterOpen(false);
      setRegOwnerName('');
      setRegPhone('');
      setRegModel('');
      setRegPlate('');
      setRegOdometer('');
      fetchDatabaseBikes();
    } catch (err) {
      console.error('Error saving vehicle:', err);
    } finally {
      setRegistering(false);
    }
  };

  const handleAddOfficialModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setModelError(null);
    setModelSuccess(null);

    if (!newBrand.trim() || !newModelName.trim()) {
      setModelError('Please provide both Brand and Model Name.');
      return;
    }

    setSavingModel(true);
    try {
      const res = await addOfficialCatalogModel({
        brand: newBrand.trim(),
        name: newModelName.trim(),
        category: newCategory,
        cc_displacement: Number(newCc) || 150,
      });

      if (!res.success) {
        setModelError(res.error || 'Failed to add model to official catalog.');
      } else {
        setModelSuccess(`Successfully added "${newModelName.trim()}" to the official catalog!`);
        setTimeout(() => {
          setIsAddModelOpen(false);
          setNewModelName('');
          setModelSuccess(null);
        }, 1200);
      }
    } catch (err: unknown) {
      setModelError(err instanceof Error ? err.message : 'Error adding model.');
    } finally {
      setSavingModel(false);
    }
  };

  const handleToggleStatus = async (model: OfficialBikeModel) => {
    try {
      const res = await toggleOfficialCatalogModelStatus(model.id || '', model.name, model.is_active !== false);
      if (!res.success) {
        toast.error('Error: ' + (res.error || 'Failed to update model status.'));
      }
    } catch (err) {
      console.error('Status toggle failed:', err);
    }
  };

  // Fleet list aggregator
  const fleet: FleetBike[] = useMemo(() => {
    const map = new Map<string, FleetBike>();

    dbBikes.forEach((b) => {
      const plate = (b.plate_number || '').toUpperCase().trim();
      if (!plate) return;

      const profile = b.user_id ? dbProfiles.get(b.user_id) : undefined;
      map.set(plate, {
        id: b.id,
        model: b.model || 'Motorcycle Unit',
        plate_number: plate,
        year_model: b.year_model || '2024',
        odometer: b.odometer || '0 km',
        owner_name: profile?.full_name || 'Rider Customer',
        owner_phone: profile?.phone_number || 'N/A',
        owner_id: b.user_id,
        ticketsCount: 0,
      });
    });

    tickets.forEach((t) => {
      const bike = t.motorcycles;
      const plate = (bike?.plate_number || t.notes?.match(/Plate:\s*([A-Z0-9\s-]+)/i)?.[1] || 'UNKNOWN').toUpperCase().trim();
      if (!plate || plate === 'UNKNOWN') return;

      const existing = map.get(plate);
      const ticketCustomer = t.customer_name || t.profiles?.full_name || '';
      const ticketPhone = t.customer_phone || t.profiles?.phone_number || '';

      if (existing) {
        existing.ticketsCount += 1;
        if (ticketPhone && (existing.owner_phone === 'N/A' || !existing.owner_phone)) {
          existing.owner_phone = ticketPhone;
        }
        if (ticketCustomer && (existing.owner_name === 'Rider Customer' || !existing.owner_name)) {
          existing.owner_name = ticketCustomer;
        }
      } else {
        map.set(plate, {
          id: bike?.id || `bike-${plate}`,
          model: bike?.model || t.notes?.match(/Model:\s*([^|]+)/i)?.[1]?.trim() || 'Motorcycle Unit',
          plate_number: plate,
          year_model: bike?.year_model || '2024',
          odometer: t.odometer || bike?.odometer || '0 km',
          owner_name: ticketCustomer || 'Rider Customer',
          owner_phone: ticketPhone || 'N/A',
          ticketsCount: 1,
        });
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

  // Catalog Brands list
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    catalog.forEach((m) => {
      if (m.brand) brandsSet.add(m.brand);
    });
    return ['All', ...Array.from(brandsSet).sort()];
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((m) => {
      const matchBrand = selectedBrand === 'All' || m.brand.toLowerCase() === selectedBrand.toLowerCase();
      const matchQuery =
        !catalogSearch.trim() ||
        m.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        m.brand.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (m.category && m.category.toLowerCase().includes(catalogSearch.toLowerCase()));
      return matchBrand && matchQuery;
    });
  }, [catalog, selectedBrand, catalogSearch]);

  const filteredRegBikes = useMemo(() => {
    if (!regModel.trim()) return catalog.slice(0, 8);
    const q = regModel.toLowerCase();
    return catalog
      .filter((b) => b.name.toLowerCase().includes(q) || b.brand.toLowerCase().includes(q))
      .slice(0, 8);
  }, [catalog, regModel]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Sub-Tab Switcher */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-end gap-4">

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('fleet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subTab === 'fleet'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Customer Fleet ({fleet.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('catalog')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              subTab === 'catalog'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Official Catalog ({catalog.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: CUSTOMER FLEET REGISTRY */}
      {/* ======================================================== */}
      {subTab === 'fleet' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by plate number, model, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchDatabaseBikes}
                className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Refresh database records"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingBikes ? 'animate-spin text-orange-500' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Register Vehicle</span>
              </button>
            </div>
          </div>

          {/* Fleet Grid */}
          {loadingBikes ? (
            <div className="p-12 text-center bg-white border border-slate-200/80 rounded-2xl">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Loading motorcycle fleet records...</p>
            </div>
          ) : filteredFleet.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200/80 rounded-2xl">
              <Bike className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-sm text-slate-700">No Vehicles Found</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                {searchQuery ? 'No motorcycles match your search.' : 'No customer vehicles registered in the workshop yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFleet.map((bike) => (
                <div
                  key={bike.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                          <Bike className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-tight">
                            {bike.model}
                          </h4>
                          <span className="inline-block px-2 py-0.5 mt-0.5 rounded-md bg-slate-100 font-mono font-bold text-[11px] text-slate-700">
                            {bike.plate_number}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-orange-100/60 text-orange-700 text-[10px] font-bold">
                        {bike.ticketsCount} {bike.ticketsCount === 1 ? 'Service' : 'Services'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <User className="w-3.5 h-3.5" /> Owner
                        </span>
                        <span className="font-semibold text-slate-800">{bike.owner_name}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Phone className="w-3.5 h-3.5" /> Contact
                        </span>
                        {bike.owner_phone && bike.owner_phone !== 'N/A' ? (
                          <a
                            href={`tel:${bike.owner_phone}`}
                            className="font-semibold text-orange-600 hover:underline"
                          >
                            {bike.owner_phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Gauge className="w-3.5 h-3.5" /> Mileage
                        </span>
                        <span className="font-semibold text-slate-700 font-mono text-[11px]">
                          {bike.odometer || '0 km'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedVehicle(bike)}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-slate-700 hover:text-orange-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-orange-500" />
                    <span>View Service Timeline</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: OFFICIAL MOTORCYCLE DIRECTORY (CATALOG) */}
      {/* ======================================================== */}
      {subTab === 'catalog' && (
        <div className="space-y-6">
          {/* Catalog KPI Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Catalog Models
              </span>
              <div className="text-2xl font-black text-slate-900">{catalog.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">2024–2026 Philippine Lineup</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Active in Booking
              </span>
              <div className="text-2xl font-black text-emerald-600">
                {catalog.filter((m) => m.is_active !== false).length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Available for rider selection</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Supported Brands
              </span>
              <div className="text-2xl font-black text-orange-600">{availableBrands.length - 1}</div>
              <p className="text-[11px] text-slate-400 mt-1">Honda, Yamaha, Suzuki, CFMoto, etc.</p>
            </div>
          </div>

          {/* Controls & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search official model name or category (e.g. NMAX, Click, 450MT)..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadCatalogModels}
                className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Reload catalog"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingCatalog ? 'animate-spin text-orange-500' : ''}`} />
                <span className="hidden sm:inline">Reload</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddModelOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Official Model</span>
                </button>
              )}
            </div>
          </div>

          {/* Brand Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {availableBrands.map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrand(brand)}
                className={`px-3 py-1.5 rounded-full font-bold transition whitespace-nowrap cursor-pointer text-xs ${
                  selectedBrand === brand
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>

          {/* Official Catalog Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Official Model Name</th>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Engine CC</th>
                    <th className="py-3 px-4">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="py-10 text-center text-slate-400">
                        No motorcycle models match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((model, idx) => {
                      const isActive = model.is_active !== false;
                      return (
                        <tr key={model.id || `${model.name}-${idx}`} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {model.name}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {model.brand}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium text-[11px]">
                            {model.category || 'Standard'}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-600 text-[11px]">
                            {model.cc_displacement ? `${model.cc_displacement} cc` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(model)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                  isActive
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: REGISTER VEHICLE MODAL */}
      {/* ======================================================== */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Bike className="w-5 h-5 text-orange-600" />
                <span>Register Motorcycle to Fleet</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterVehicle} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer / Owner Name</label>
                <input
                  type="text"
                  placeholder="e.g. Juan Dela Cruz"
                  value={regOwnerName}
                  onChange={(e) => setRegOwnerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Contact Number</label>
                <input
                  type="text"
                  placeholder="e.g. 0917-123-4567"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="relative" ref={regDropdownRef}>
                <label className="font-bold text-slate-700 block mb-1">Motorcycle Model *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Honda Click 125i, Yamaha NMAX..."
                    value={regModel}
                    onChange={(e) => {
                      setRegModel(e.target.value);
                      setRegDropdownOpen(true);
                    }}
                    onFocus={() => setRegDropdownOpen(true)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 pr-8 focus:outline-none focus:border-orange-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {regDropdownOpen && (filteredRegBikes.length > 0 || regModel.trim().length > 0) && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-44 overflow-y-auto divide-y divide-slate-100">
                    {filteredRegBikes.map((bike, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setRegModel(bike.name);
                          setRegDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-semibold text-slate-800">{bike.name}</span>
                        <span className="text-[10px] text-slate-400">{bike.brand}</span>
                      </button>
                    ))}
                    {regModel.trim().length > 0 && !filteredRegBikes.some((b) => b.name.toLowerCase() === regModel.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => setRegDropdownOpen(false)}
                        className="w-full text-left px-3 py-2 text-xs bg-orange-50/70 hover:bg-orange-100 text-orange-900 font-semibold flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate pr-2">+ Use &quot;{regModel.trim()}&quot; as custom model</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-200/80 text-orange-950 font-bold uppercase shrink-0">Custom</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Plate Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NDE 5678"
                  value={regPlate}
                  onChange={(e) => setRegPlate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 uppercase font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Year Model</label>
                  <input
                    type="text"
                    placeholder="2024"
                    value={regYear}
                    onChange={(e) => setRegYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Odometer (km)</label>
                  <input
                    type="text"
                    placeholder="e.g. 5,000"
                    value={regOdometer}
                    onChange={(e) => setRegOdometer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold cursor-pointer hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {registering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Vehicle</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD OFFICIAL MODEL TO CATALOG (ADMIN ONLY) */}
      {/* ======================================================== */}
      {isAddModelOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-600" />
                <span>+ Add Official Model to Catalog</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModelOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modelError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modelError}</span>
              </div>
            )}

            {modelSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{modelSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddOfficialModel} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Motorcycle Brand *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yamaha, Honda, CFMoto, Kymco..."
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-orange-500 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Official Model Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yamaha NMAX 155 Tech MAX 2025"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-orange-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-orange-500 font-semibold"
                  >
                    <option value="Scooter">Scooter</option>
                    <option value="Maxi Scooter">Maxi Scooter</option>
                    <option value="Underbone">Underbone</option>
                    <option value="Sport Underbone">Sport Underbone</option>
                    <option value="Dual Sport">Dual Sport / Trail</option>
                    <option value="Adventure">Adventure Tourer</option>
                    <option value="Naked / Sport">Naked / Sport</option>
                    <option value="Cruiser">Cruiser</option>
                    <option value="Big Bike">Big Bike</option>
                    <option value="Commuter">Commuter / Tricycle</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Engine Displacement (cc)</label>
                  <input
                    type="number"
                    min="50"
                    max="2500"
                    value={newCc}
                    onChange={(e) => setNewCc(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-orange-500 font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                ℹ️ <strong>Shop Owner Directive:</strong> This will publish this motorcycle model to the master catalog, making it immediately available in customer booking and staff walk-in intake.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModelOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold cursor-pointer hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingModel}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {savingModel ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Publish to Catalog</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Service History Timeline Modal */}
      {selectedVehicle && (
        <VehicleHistoryModal
          isOpen={Boolean(selectedVehicle)}
          vehicle={selectedVehicle}
          tickets={tickets}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}
