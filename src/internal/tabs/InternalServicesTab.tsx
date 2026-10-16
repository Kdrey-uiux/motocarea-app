import { useState, useMemo, useEffect } from 'react';
import { UserRole } from '../types/internal';
import { 
  getSharedServiceCatalog, 
  saveSharedServiceCatalog, 
  UnifiedServicePackage, 
  SERVICE_CATEGORIES, 
  ServiceCategoryKey 
} from '../../utils/serviceCatalog';
import { 
  Layers, 
  Clock, 
  CheckCircle2, 
  Edit3, 
  Plus, 
  Trash2, 
  X, 
  Save, 
  Wrench,
  Search
} from 'lucide-react';
import { toast } from '../utils/toast';

interface InternalServicesTabProps {
  currentRole?: UserRole;
}

export default function InternalServicesTab({
  currentRole = 'admin',
}: InternalServicesTabProps) {
  const [packages, setPackages] = useState<UnifiedServicePackage[]>(() => getSharedServiceCatalog());
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync with cross-tab / shared updates
  useEffect(() => {
    const handleUpdate = () => {
      setPackages(getSharedServiceCatalog());
    };
    window.addEventListener('motocare_services_updated', handleUpdate);
    return () => window.removeEventListener('motocare_services_updated', handleUpdate);
  }, []);

  const [editingService, setEditingService] = useState<UnifiedServicePackage | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ServiceCategoryKey>('maintenance');
  const [formTag, setFormTag] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formBay, setFormBay] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formChecklist, setFormChecklist] = useState<string>('');

  const saveToStorage = (updated: UnifiedServicePackage[]) => {
    setPackages(updated);
    saveSharedServiceCatalog(updated).then((res) => {
      if (!res.success) {
        toast.error('Error: ' + (res.error || 'Failed to save the service catalog to the database.'));
      }
    });
  };

  const openEditModal = (srv: UnifiedServicePackage) => {
    setEditingService(srv);
    setIsAddingNew(false);
    setFormName(srv.name || srv.title);
    setFormCategory(srv.category || 'maintenance');
    setFormTag(srv.tag || '');
    setFormTime(srv.estimatedTime || srv.estimatedDuration);
    setFormPrice(srv.priceRange || srv.estimatedCost);
    setFormBay(srv.recommendedBay || 'Bay 01 - Quick Lube Express');
    setFormDesc(srv.description || '');
    setFormChecklist((srv.checklist || srv.inclusions || []).join('\n'));
  };

  const openAddModal = () => {
    setEditingService(null);
    setIsAddingNew(true);
    setFormName('');
    setFormCategory('maintenance');
    setFormTag('');
    setFormTime('30 - 45 mins');
    setFormPrice('₱350 - ₱650');
    setFormBay('Bay 01 - Quick Lube Express');
    setFormDesc('');
    setFormChecklist('');
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const checklistArr = formChecklist
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (isAddingNew) {
      const newSrv: UnifiedServicePackage = {
        id: formName.trim(),
        name: formName.trim(),
        title: formName.trim(),
        category: formCategory,
        tag: formTag.trim() || undefined,
        estimatedTime: formTime.trim() || '1 hr',
        estimatedDuration: formTime.trim() || '1 hr',
        priceRange: formPrice.trim() || '₱500',
        estimatedCost: formPrice.trim() || 'Quoted on Inspection',
        recommendedBay: formBay.trim() || 'Bay 01 - Quick Lube Express',
        description: formDesc.trim() || 'Standard motorcycle workshop service.',
        checklist: checklistArr.length > 0 ? checklistArr : ['Comprehensive system inspection'],
        inclusions: checklistArr.length > 0 ? checklistArr : ['Comprehensive system inspection'],
      };
      saveToStorage([...packages, newSrv]);
      setIsAddingNew(false);
    } else if (editingService) {
      const updated = packages.map((s) => {
        if (s.id === editingService.id) {
          return {
            ...s,
            name: formName.trim(),
            title: formName.trim(),
            category: formCategory,
            tag: formTag.trim() || undefined,
            estimatedTime: formTime.trim(),
            estimatedDuration: formTime.trim(),
            priceRange: formPrice.trim(),
            estimatedCost: formPrice.trim(),
            recommendedBay: formBay.trim(),
            description: formDesc.trim(),
            checklist: checklistArr,
            inclusions: checklistArr,
          };
        }
        return s;
      });
      saveToStorage(updated);
      setEditingService(null);
    }
  };

  const handleDeleteService = (id: string) => {
    if (confirm('Are you sure you want to remove this service package from the catalog?')) {
      const updated = packages.filter((s) => s.id !== id);
      saveToStorage(updated);
      if (editingService?.id === id) setEditingService(null);
    }
  };

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (selectedCategory !== 'all' && pkg.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (pkg.name || pkg.title).toLowerCase().includes(q);
        const descMatch = pkg.description.toLowerCase().includes(q);
        const tagMatch = pkg.tag?.toLowerCase().includes(q);
        const bayMatch = pkg.recommendedBay.toLowerCase().includes(q);
        const listMatch = (pkg.checklist || []).some((item) => item.toLowerCase().includes(q));
        return nameMatch || descMatch || tagMatch || bayMatch || listMatch;
      }
      return true;
    });
  }, [packages, selectedCategory, searchQuery]);

  const isOwner = currentRole === 'admin';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-orange-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Service Catalog & Pricing
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Standard service packages, labor pricing, and quality checklists.
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Service</span>
          </button>
        )}
      </div>

      {/* Category Pills & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search service by name, task, or bay..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {SERVICE_CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            const count = cat.id === 'all'
              ? packages.length
              : packages.filter((p) => p.category === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isCatActive
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/25'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  isCatActive ? 'bg-white/20 text-white' : 'bg-white text-slate-500 border border-slate-200/60'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Packages */}
      {filteredPackages.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-2">
          <Layers className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No services match your filter</p>
          <p className="text-xs text-slate-400">Try clearing your search query or selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white border border-slate-200/90 hover:border-orange-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between transition group"
            >
              <div className="space-y-4">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {pkg.tag && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/80">
                          {pkg.tag}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                        {pkg.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-orange-600 transition leading-snug">
                      {pkg.name || pkg.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                        {pkg.priceRange || pkg.estimatedCost}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {pkg.estimatedTime || pkg.estimatedDuration}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommended Bay */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="truncate">
                    Target Station: <strong>{pkg.recommendedBay}</strong>
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {pkg.description}
                </p>

                {/* Checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Included Tasks & QA Checklist
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {(pkg.checklist || pkg.inclusions || []).map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight text-slate-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bottom Actions */}
              {isOwner && (
                <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => openEditModal(pkg)}
                    className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-orange-600" />
                    <span>Edit Package Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteService(pkg.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete package"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit or Add Service Modal */}
      {(editingService || isAddingNew) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-600" />
                <span>{isAddingNew ? 'Add New Service Package' : `Edit: ${editingService?.name || editingService?.title}`}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingService(null);
                  setIsAddingNew(false);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Service Name / Package Title
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Master Brake System Rebuild"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ServiceCategoryKey)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="diagnostic">I'm Not Sure / Diagnostic</option>
                    <option value="maintenance">PMS & Fluids</option>
                    <option value="transmission">CVT & Transmission</option>
                    <option value="engine">Engine & Fuel</option>
                    <option value="brakes">Brakes & Wheels</option>
                    <option value="electrical">Electrical & Battery</option>
                    <option value="custom">Custom & Upgrades</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tag / Badge (Optional)
                  </label>
                  <input
                    type="text"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    placeholder="e.g. Most Popular, Safety Essential"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Estimated Turnaround Time
                  </label>
                  <input
                    type="text"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="e.g. 1 – 1.5 hrs"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Standard Labor Price Range
                  </label>
                  <input
                    type="text"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. ₱450 - ₱750"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Target Station / Recommended Bay
                </label>
                <input
                  type="text"
                  required
                  value={formBay}
                  onChange={(e) => setFormBay(e.target.value)}
                  placeholder="e.g. Bay 02 - CVT & Transmission Lab"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Service Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Clear description of what this service covers..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Included Tasks & QA Checklist (One per line)
                </label>
                <textarea
                  rows={4}
                  required
                  value={formChecklist}
                  onChange={(e) => setFormChecklist(e.target.value)}
                  placeholder="Feeler gauge clearance check&#10;Spark plug electrode cleaning&#10;Full chassis torquing"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Each line becomes a checklist item with a green checkmark for floor technicians.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingService(null);
                    setIsAddingNew(false);
                  }}
                  className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Service Package</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
