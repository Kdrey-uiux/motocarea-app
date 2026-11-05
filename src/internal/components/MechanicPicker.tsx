import { User } from '../../components/icons';

interface MechanicPickerProps {
  value: string;
  onChange: (name: string) => void;
}

/**
 * Mechanics don't have accounts: staff just type the mechanic's name.
 */
export default function MechanicPicker({ value, onChange }: MechanicPickerProps) {
  return (
    <div className="relative">
      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type the mechanic's name"
        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
      />
    </div>
  );
}
