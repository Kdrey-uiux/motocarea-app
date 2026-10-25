import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
} from '../../components/icons';
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


type FleetDbBike = { id: string; user_id: string | null; model: string | null; plate_number: string | null; year_model: string | null; odometer: string | null };

/** Every registered motorcycle plus its owner's name/phone */
async function queryFleetBikes(): Promise<{
  bikes: FleetDbBike[];
  profiles: Map<string, { full_name: string; phone_number: string }>;
}> {
  const { data: bikes, error } = await db().from('motorcycles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  const list = (bikes || []) as FleetDbBike[];
  const profiles = new Map<string, { full_name: string; phone_number: string }>();
  const uids = Array.from(new Set(list.map((b) => b.user_id).filter((id): id is string => Boolean(id))));
  if (uids.length > 0) {
    const { data: profs } = await db().from('profiles').select('id, full_name, phone_number').in('id', uids);
    profs?.forEach((p) =>
      profiles.set(p.id, { full_name: p.full_name || 'Rider Customer', phone_number: p.phone_number || 'N/A' })
    );
  }
  return { bikes: list, profiles };
}

export default function InternalFleetTab({ tickets }: InternalFleetTabProps) {
  const session = getInternalSession();
  const isAdmin = session?.role === 'admin';

  // Sub-tab: 'fleet' (customer vehicles) or 'catalog' (official motorcycle models)
  const [subTab, setSubTab] = useState<'fleet' | 'catalog'>('fleet');

  // Fleet Sub-tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [dbBikes, setDbBikes] = useState<FleetDbBike[]>([]);
  const [dbProfiles, setDbProfiles] = useState<Map<string, { full_name: string; phone_number: string }>>(new Map());
  const [loadingBikes, setLoadingBikes] = useState(true);

  // History Modal State
  const [selectedVehicle, setSelectedVehicle] = useState<FleetBike | null>(null);

  // Register Vehicle Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regModel, setRegModel] = useState('');
  const [regPlate, setRegPlate] = useState('');
  const [regYear, setRegYear] = useState('2024');
  const [regOdometer, setRegOdometer] = useState('');
  const [registering, setRegistering] = useState(false);

  // Catalog Sub-tab state
  const [catalog, setCatalog] = useState<OfficialBikeModel[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
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

  // The spinners start on (initial load) or from the Refresh buttons
  const fetchDatabaseBikes = useCallback(() => {
    return queryFleetBikes()
      .then(({ bikes, profiles }) => {
        setDbBikes(bikes);
        setDbProfiles(profiles);
      })
      .catch((err) => console.error('Fleet bikes fetch error:', err))
      .finally(() => setLoadingBikes(false));
  }, []);
  const refreshBikes = () => {
    setLoadingBikes(true);
    fetchDatabaseBikes();
  };

  const loadCatalogModels = useCallback(() => {
    return getCompleteMotorcycleCatalog()
      .then(setCatalog)
      .catch((err) => console.error('Catalog load error:', err))
      .finally(() => setLoadingCatalog(false));
  }, []);
  const refreshCatalog = () => {
    setLoadingCatalog(true);
    loadCatalogModels();
  };

  useEffect(() => {
    fetchDatabaseBikes();
    loadCatalogModels();
    window.addEventListener('motocare_catalog_updated', loadCatalogModels);
    return () => window.removeEventListener('motocare_catalog_updated', loadCatalogModels);
  }, [fetchDatabaseBikes, loadCatalogModels]);

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

      const { error } = await db().from('motorcycles').insert({
        plate_number: cleanPlate,
        model: cleanModel,
        year_model: regYear.trim() || '2024',
        odometer: regOdometer.trim() ? `${regOdometer.trim()} km` : '0 km',
      });
      if (error) throw error;

      toast.success(`${cleanModel} (${cleanPlate}) registered.`);
      setIsRegisterOpen(false);
      setRegModel('');
      setRegPlate('');
      setRegOdometer('');
      fetchDatabaseBikes();
    } catch (err) {
      console.error('Error saving vehicle:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to register the vehicle.');
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
        owner_id: b.user_id ?? undefined,
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

  const activeModels = catalog.filter((m) => m.is_active !== false).length;
  const card = 'bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated';
  const primaryBtn =
    'px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 transition cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0';
  const iconBtn =
    'w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shrink-0';
  const searchInput =
    'w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:not-italic placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition';

  return (
    <div className="space-y-4">
      {/* Toolbar: which list + the main action for it */}
      <div className={`${card} p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="flex items-center p-1 bg-slate-100 rounded-full self-start">
          {(
            [
              { id: 'fleet', label: 'Customer motorcycles', short: 'Motorcycles', icon: Bike, count: fleet.length },
              { id: 'catalog', label: 'Model catalog', short: 'Catalog', icon: BookOpen, count: catalog.length },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const selected = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                aria-pressed={selected}
                className={`px-3.5 py-2 rounded-full text-sm flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                  selected ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${selected ? 'text-orange-500' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
                <span className="text-xs text-slate-400 tabular-nums">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {subTab === 'fleet' ? (
          <button type="button" onClick={() => setIsRegisterOpen(true)} className={`self-start sm:self-auto ${primaryBtn}`}>
            <Plus className="w-4 h-4" />
            Register motorcycle
          </button>
        ) : (
          isAdmin && (
            <button type="button" onClick={() => setIsAddModelOpen(true)} className={`self-start sm:self-auto ${primaryBtn}`}>
              <Plus className="w-4 h-4" />
              Add model
            </button>
          )
        )}
      </div>

      {/* ======================== CUSTOMER MOTORCYCLES ======================== */}
      {subTab === 'fleet' && (
        <section className={`${card} overflow-clip`}>
          <div className="px-4 sm:px-5 py-4 flex items-center gap-2 border-b border-slate-100">
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search plate, model, owner or phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={searchInput}
              />
            </div>
            <button type="button" onClick={refreshBikes} className={iconBtn} title="Refresh" aria-label="Refresh motorcycles">
              <RefreshCw className={`w-4 h-4 ${loadingBikes ? 'animate-spin text-orange-500' : ''}`} />
            </button>
            <span className="hidden md:block ml-auto text-sm text-slate-400">
              {filteredFleet.length} motorcycle{filteredFleet.length === 1 ? '' : 's'}
            </span>
          </div>

          {loadingBikes ? (
            <div className="p-12 text-center">
              <Loader2 className="w-7 h-7 text-orange-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-500">Loading motorcycles…</p>
            </div>
          ) : filteredFleet.length === 0 ? (
            <div className="p-12 text-center">
              <span className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
                <Bike className="w-6 h-6" />
              </span>
              <p className="mt-3 font-display font-bold text-slate-900">No motorcycles found</p>
              <p className="text-sm text-slate-500">
                {searchQuery ? 'Try another plate, model or name.' : 'Motorcycles show up here once a customer books or one is registered.'}
              </p>
            </div>
          ) : (
            <>
              {/* Column labels (desktop) */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 text-xs font-medium text-slate-400 border-b border-slate-100">
                <span className="col-span-5">Motorcycle</span>
                <span className="col-span-3">Owner</span>
                <span className="col-span-2">Mileage · visits</span>
                <span className="col-span-2 text-right">History</span>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredFleet.map((bike) => {
                  const hasPhone = bike.owner_phone && bike.owner_phone !== 'N/A';
                  return (
                    <div
                      key={bike.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 md:items-center px-4 sm:px-5 py-4 hover:bg-slate-50/60 transition"
                    >
                      <div className="md:col-span-5 flex items-center gap-3 min-w-0">
                        <span className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                          <Bike className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate" title={bike.model}>
                            {bike.model}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-2">
                            <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {bike.plate_number}
                            </span>
                            {bike.year_model && <span>{bike.year_model}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="md:col-span-3 min-w-0 pl-14 md:pl-0 text-sm">
                        <p className="font-medium text-slate-800 truncate flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0 md:hidden" />
                          {bike.owner_name}
                        </p>
                        {hasPhone ? (
                          <a
                            href={`tel:${bike.owner_phone}`}
                            className="text-xs text-slate-500 hover:text-orange-600 inline-flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {bike.owner_phone}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">No phone</span>
                        )}
                      </div>

                      <div className="md:col-span-2 pl-14 md:pl-0 text-sm flex md:block items-center gap-3">
                        <p className="text-slate-700 flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-slate-400" />
                          {bike.odometer || '0 km'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {bike.ticketsCount} visit{bike.ticketsCount === 1 ? '' : 's'}
                        </p>
                      </div>

                      <div className="md:col-span-2 pl-14 md:pl-0 md:text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedVehicle(bike)}
                          className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 text-slate-700 text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <History className="w-3.5 h-3.5" />
                          History
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* ======================== MODEL CATALOG ======================== */}
      {subTab === 'catalog' && (
        <section className={`${card} overflow-clip`}>
          <div className="px-4 sm:px-5 pt-4 pb-3 space-y-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-lg">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search model or category (e.g. NMAX, Click, Scooter)"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className={searchInput}
                />
              </div>
              <button type="button" onClick={refreshCatalog} className={iconBtn} title="Reload" aria-label="Reload catalog">
                <RefreshCw className={`w-4 h-4 ${loadingCatalog ? 'animate-spin text-orange-500' : ''}`} />
              </button>
              <p className="hidden md:block ml-auto text-sm text-slate-400">
                {catalog.length} models · {activeModels} bookable · {availableBrands.length - 1} brands
              </p>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {availableBrands.map((brand) => {
                const selected = selectedBrand === brand;
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedBrand(brand)}
                    aria-pressed={selected}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition cursor-pointer ${
                      selected
                        ? 'bg-orange-50 text-orange-700 font-semibold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    {brand}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 sm:pl-5 font-medium">Model</th>
                  <th className="py-2.5 px-4 font-medium">Brand</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Engine</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  {isAdmin && <th className="py-2.5 px-4 sm:pr-5 font-medium text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-slate-400">
                      No models match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((model, idx) => {
                    const isActive = model.is_active !== false;
                    return (
                      <tr key={model.id || `${model.name}-${idx}`} className="hover:bg-slate-50/60 transition">
                        <td className={`py-3 px-4 sm:pl-5 font-medium ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                          {model.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{model.brand}</td>
                        <td className="py-3 px-4 text-slate-500">{model.category || 'Standard'}</td>
                        <td className="py-3 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                          {model.cc_displacement ? `${model.cc_displacement} cc` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium whitespace-nowrap">
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {isActive ? 'Bookable' : 'Hidden from booking'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 sm:pr-5 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(model)}
                              className={`px-3 py-1 rounded-full border text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                                isActive
                                  ? 'border-slate-200 bg-white text-slate-600 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50'
                                  : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                              }`}
                            >
                              {isActive ? 'Hide' : 'Make bookable'}
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
        </section>
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
