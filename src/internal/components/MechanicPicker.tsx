import { User, Check } from 'lucide-react';
import { useMechanics } from '../utils/mechanics';

interface MechanicPickerProps {
  value: string;
  onChange: (name: string) => void;
}

/**
 * Type a mechanic's name or tap one of the active staff from Team.
 */
export default function MechanicPicker({ value, onChange }: MechanicPickerProps) {
  const mechanics = useMechanics();
  const current = value.trim().toLowerCase();

  return (
    <div className="space-y-2">
      <div className="relative">
        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type the mechanic's name"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition font-medium"
        />
      </div>
      {mechanics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mechanics.map((name) => {
            const isSelected = name.toLowerCase() === current;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange(isSelected ? '' : name)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
