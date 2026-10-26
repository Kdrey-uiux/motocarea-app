import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Search
} from '../../components/icons';
import { toast } from '../utils/toast';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

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
    setFormBay(srv.recommendedBay || '');
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
    setFormBay('');
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
        priceRange: '',
        estimatedCost: 'Quoted on Inspection',
        recommendedBay: formBay.trim(),
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
        const listMatch = (pkg.checklist || []).some((item) => item.toLowerCase().includes(q));
        return nameMatch || descMatch || tagMatch || listMatch;
      }
      return true;
    });
  }, [packages, selectedCategory, searchQuery]);

  const isOwner = currentRole === 'admin';

  const categoryLabel = (id: ServiceCategoryKey) => SERVICE_CATEGORIES.find((c) => c.id === id)?.label || id;
  const closeModal = () => {
    setEditingService(null);
    setIsAddingNew(false);
  };
  const fieldLabel = 'block text-sm font-medium text-slate-700 mb-1.5';
  const fieldInput =
    'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:not-italic placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition';

  return (
    <div className="space-y-4 pb-12">
      {/* Toolbar: search, categories, and (owner) add */}
      <div className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search service or task"
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:not-italic placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
            />
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 transition cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add service</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {SERVICE_CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            const count = cat.id === 'all' ? packages.length : packages.filter((p) => p.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                aria-pressed={isCatActive}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isCatActive ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                {cat.label}
                <span className={`text-xs tabular-nums ${isCatActive ? 'text-orange-500' : 'text-slate-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Service cards */}
      {filteredPackages.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated p-12 text-center">
          <span className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </span>
          <p className="mt-3 font-display font-bold text-slate-900">No services match your filter</p>
          <p className="text-sm text-slate-500">Clear the search or pick another category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => {
            const tasks = pkg.checklist || pkg.inclusions || [];
            return (
              <article
                key={pkg.id}
                className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.5rem] card-elevated p-5 flex flex-col gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">{categoryLabel(pkg.category)}</span>
                    {pkg.tag && (
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium whitespace-nowrap">
                        {pkg.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-display text-lg font-bold tracking-tight text-slate-900 leading-snug">
                    {pkg.name || pkg.title}
                  </h3>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {pkg.estimatedTime || pkg.estimatedDuration}
                  </span>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{pkg.description}</p>

                {tasks.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-400 mb-2">What&apos;s included</p>
                    <ul className="space-y-1.5">
                      {tasks.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-snug">
                          <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {isOwner && (
                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openEditModal(pkg)}
                      className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(pkg.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Remove this service"
                      aria-label={`Remove ${pkg.name || pkg.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Add / edit service */}
      {(editingService || isAddingNew) &&
        createPortal(
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <ScrollLock />
            <form
              onSubmit={handleSaveService}
              className="bg-white w-full max-w-lg rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/80 flex items-start justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold tracking-tight text-slate-900 truncate">
                      {isAddingNew ? 'New service' : 'Edit service'}
                    </h3>
                    <p className="text-sm text-slate-500 truncate">
                      {isAddingNew ? 'Customers can book it once saved.' : editingService?.name || editingService?.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
                <div>
                  <label className={fieldLabel}>Service name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Brake System Overhaul"
                    className={fieldInput}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={fieldLabel}>Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ServiceCategoryKey)}
                      className={fieldInput}
                    >
                      {SERVICE_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={fieldLabel}>
                      Badge <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formTag}
                      onChange={(e) => setFormTag(e.target.value)}
                      placeholder="e.g. Most Popular"
                      className={fieldInput}
                    />
                  </div>
                </div>

                <div>
                  <label className={fieldLabel}>How long it takes</label>
                  <input
                    type="text"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="e.g. 1 – 1.5 hrs"
                    className={fieldInput}
                  />
                </div>

                <div>
                  <label className={fieldLabel}>Description</label>
                  <textarea
                    rows={3}
                    required
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="What this service covers, in plain words"
                    className={`${fieldInput} resize-none`}
                  />
                </div>

                <div>
                  <label className={fieldLabel}>What&apos;s included</label>
                  <textarea
                    rows={5}
                    required
                    value={formChecklist}
                    onChange={(e) => setFormChecklist(e.target.value)}
                    placeholder={'Engine oil and filter change\nBrake check\nRoad test'}
                    className={`${fieldInput} resize-none`}
                  />
                  <p className="text-xs text-slate-400 mt-1.5">One task per line. Customers see these when booking.</p>
                </div>
              </div>

              <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  Save service
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
}
