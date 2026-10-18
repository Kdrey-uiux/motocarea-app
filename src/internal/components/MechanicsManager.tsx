import { useState } from 'react';
import { Wrench, Plus, X } from 'lucide-react';
import { saveMechanics, useMechanics } from '../utils/mechanics';
import { toast } from '../utils/toast';

/**
 * Shop mechanics (names only, no login). Staff assign them to jobs in Dispatch/Queue.
 */
export default function MechanicsManager({ currentStaffName }: { currentStaffName?: string }) {
  const mechanics = useMechanics();
  const [newName, setNewName] = useState('');

  const save = (names: string[], successMessage: string) => {
    saveMechanics(names, currentStaffName).then((res) => {
      if (res.success) toast.success(successMessage);
      else toast.error(res.error || 'Failed to save the mechanics list.');
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newName.trim();
    if (!clean) return;
    if (mechanics.some((n) => n.toLowerCase() === clean.toLowerCase())) {
      toast.info(`${clean} is already on the list.`);
      return;
    }
    save([...mechanics, clean], `${clean} added to mechanics.`);
    setNewName('');
  };

  const handleRemove = (name: string) => {
    save(
      mechanics.filter((n) => n !== name),
      `${name} removed from mechanics.`
    );
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-5 h-5 text-orange-600" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Mechanics</h2>
        </div>
        <p className="text-xs text-slate-500">
          Names only — mechanics don't log in. Staff assign them to jobs. Names typed in Dispatch are added here
          automatically.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Mechanic's name"
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {mechanics.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No mechanics yet. Add the names of your shop mechanics above.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {mechanics.map((name) => (
            <span
              key={name}
              className="pl-3 pr-1.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              {name}
              <button
                type="button"
                onClick={() => handleRemove(name)}
                className="w-5 h-5 rounded-full hover:bg-rose-100 hover:text-rose-600 text-slate-400 flex items-center justify-center cursor-pointer"
                aria-label={`Remove ${name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
