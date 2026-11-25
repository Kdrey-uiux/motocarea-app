import { useMemo, useState } from 'react';
import { ChevronDown, User } from '../../components/icons';
import {
  cleanMechanicName,
  hasAttendanceToday,
  isInToday,
  MECHANIC_NAME_MAX,
  mechanicKey,
  mechanicLoads,
  useMechanicRoster,
} from '../../utils/workshopMechanics';

interface MechanicPickerProps {
  value: string;
  onChange: (name: string) => void;
  /** Workshop tickets, to show how many jobs each mechanic has right now */
  tickets: { status: string; stage?: number | null; assigned_mechanic?: string | null }[];
  id?: string;
  autoFocus?: boolean;
}

const OTHER = '__other__';
const FIELD =
  'w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition';

const jobsText = (n: number) => (n === 0 ? 'free' : `${n} job${n === 1 ? '' : 's'} now`);

/**
 * Mechanics don't have accounts: staff pick one from the owner's list (Team page).
 * Mechanics marked "In today" come first, least busy first. "Other" still allows a typed
 * name, which then shows up on the Team page for the owner to add.
 */
export default function MechanicPicker({ value, onChange, tickets, id, autoFocus }: MechanicPickerProps) {
  const roster = useMechanicRoster();
  const [typing, setTyping] = useState(false);

  const loads = useMemo(() => mechanicLoads(tickets), [tickets]);
  const active = roster.mechanics.filter((m) => m.active);
  const attendanceTaken = hasAttendanceToday(roster);

  const byLoad = (a: { name: string }, b: { name: string }) =>
    (loads.get(mechanicKey(a.name))?.active ?? 0) - (loads.get(mechanicKey(b.name))?.active ?? 0) ||
    a.name.localeCompare(b.name);
  const inToday = active.filter((m) => !attendanceTaken || isInToday(roster, m.id)).sort(byLoad);
  const dayOff = attendanceTaken ? active.filter((m) => !isInToday(roster, m.id)).sort(byLoad) : [];

  // The current name, matched to the list without caring about capital letters
  const listed = active.find((m) => mechanicKey(m.name) === mechanicKey(value));
  const offList = cleanMechanicName(value) && !listed ? cleanMechanicName(value) : null;
  const turnedOff = offList ? roster.mechanics.some((m) => !m.active && mechanicKey(m.name) === mechanicKey(offList)) : false;

  // "Least busy" only when one mechanic clearly has fewer jobs than everyone else in today
  const counts = inToday.map((m) => loads.get(mechanicKey(m.name))?.active ?? 0);
  const leastBusyId = inToday.length > 1 && counts[0] < counts[1] ? inToday[0].id : null;

  // No list yet (or staff chose "Other"): a plain name box, as before
  if (active.length === 0 || typing) {
    return (
      <div className="space-y-1.5">
        <div className="relative">
          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id={id}
            type="text"
            value={value}
            autoFocus={autoFocus || typing}
            maxLength={MECHANIC_NAME_MAX}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type the mechanic's name"
            className={`${FIELD} pr-3.5`}
          />
        </div>
        {active.length === 0 ? (
          <p className="text-xs text-slate-400">No mechanics on the list yet. The owner adds them on the Team page.</p>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTyping(false);
              if (!listed) onChange('');
            }}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
          >
            Back to the mechanic list
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select
        id={id}
        autoFocus={autoFocus}
        value={listed ? listed.name : offList ?? ''}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setTyping(true);
            onChange('');
          } else {
            onChange(e.target.value);
          }
        }}
        className={`${FIELD} pr-9 appearance-none cursor-pointer`}
      >
        <option value="">Not assigned yet</option>
        {offList && (
          <option value={offList}>
            {offList} {turnedOff ? '(turned off)' : '(not on the list)'}
          </option>
        )}
        <optgroup label={attendanceTaken ? 'In today' : 'Mechanics'}>
          {inToday.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name} · {jobsText(loads.get(mechanicKey(m.name))?.active ?? 0)}
              {m.id === leastBusyId ? ' · least busy' : ''}
            </option>
          ))}
        </optgroup>
        {dayOff.length > 0 && (
          <optgroup label="Day off">
            {dayOff.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name} · day off
              </option>
            ))}
          </optgroup>
        )}
        <option value={OTHER}>Other (type a name)…</option>
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}
