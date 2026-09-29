import { useMemo } from 'react';
import { AdminTicket, WorkshopBay, WorkshopMechanic } from '../types/admin';
import { 
  Wrench, 
  CheckCircle2, 
  User, 
  Bike, 
  Phone, 
  ArrowRight
} from 'lucide-react';

interface AdminBaysTabProps {
  tickets: AdminTicket[];
  onOpenDispatch: (ticket: AdminTicket) => void;
}

const STATIC_BAYS = [
  {
    id: 'bay-1',
    bayNumber: '01',
    name: 'Bay 01 - Quick Service & Oil Express',
    type: 'Preventive Maintenance',
    liftType: 'Hydraulic Scissor Lift A',
  },
  {
    id: 'bay-2',
    bayNumber: '02',
    name: 'Bay 02 - CVT & Drivetrain Lab',
    type: 'Transmission & Belt Tuning',
    liftType: 'Pneumatic Platform Lift B',
  },
  {
    id: 'bay-3',
    bayNumber: '03',
    name: 'Bay 03 - Engine Overhaul & Heavy Repair',
    type: 'Engine, Head & Valve Clearance',
    liftType: 'Heavy Duty Lift C',
  },
  {
    id: 'bay-4',
    bayNumber: '04',
    name: 'Bay 04 - Final QA & Electrical Station',
    type: 'Wiring, Stator & Road QA',
    liftType: 'Diagnostic Inspection Bay D',
  },
];

const MECHANICS: WorkshopMechanic[] = [
  {
    id: 'mech-1',
    name: 'Kuya Jun Santos',
    nickname: 'Kuya Jun',
    specialty: 'Master Tech & Engine / Valve Adjustments',
    status: 'ON_DUTY',
    phone: '0917-882-9102',
    completedJobsToday: 3,
  },
  {
    id: 'mech-2',
    name: 'Mark Reyes',
    nickname: 'Mark',
    specialty: 'CVT Tuning, Pulley Deglazing & Belts',
    status: 'ON_DUTY',
    phone: '0928-554-1923',
    completedJobsToday: 2,
  },
  {
    id: 'mech-3',
    name: 'Arnel Mendoza',
    nickname: 'Arnel',
    specialty: 'Electrical, FI ECU Scan & Stator Rewind',
    status: 'ON_DUTY',
    phone: '0995-123-8871',
    completedJobsToday: 2,
  },
  {
    id: 'mech-4',
    name: 'Rolly Castro',
    nickname: 'Rolly',
    specialty: 'Fast Lube, Caliper Bleeding & Brake Pads',
    status: 'ON_DUTY',
    phone: '0939-771-4402',
    completedJobsToday: 4,
  },
];

export default function AdminBaysTab({ tickets, onOpenDispatch }: AdminBaysTabProps) {
  // Map tickets to Bays
  const baysData: Array<WorkshopBay & { activeTicket?: AdminTicket }> = useMemo(() => {
    return STATIC_BAYS.map((staticBay) => {
      const matchingTicket = tickets.find(
        (t) =>
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED' &&
          t.assigned_bay &&
          t.assigned_bay.toLowerCase().includes(`bay ${staticBay.bayNumber.toLowerCase()}`)
      );

      if (matchingTicket) {
        return {
          ...staticBay,
          status: 'OCCUPIED' as const,
          activeTicketId: matchingTicket.id,
          activeTicketCode: matchingTicket.ticket_code,
          bikeModel: matchingTicket.motorcycles?.model || 'Motorcycle Unit',
          plateNumber: matchingTicket.motorcycles?.plate_number || 'No Plate',
          serviceType: matchingTicket.service_type,
          assignedMechanic: matchingTicket.assigned_mechanic || 'Unassigned',
          stage: matchingTicket.stage,
          timeStarted: matchingTicket.created_at,
          activeTicket: matchingTicket,
        };
      }

      return {
        ...staticBay,
        status: 'AVAILABLE' as const,
      };
    });
  }, [tickets]);

  const occupiedCount = baysData.filter((b) => b.status === 'OCCUPIED').length;
  const occupancyPercentage = Math.round((occupiedCount / baysData.length) * 100);

  return (
    <div className="space-y-6">
      {/* Floor Overview Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Workshop Bays & Station Dispatch</h2>
          </div>
          <p className="text-xs text-slate-500">
            Real-time floor occupancy and hydraulic lift status for Santa Maria Workshop Hub.
          </p>
        </div>

        {/* Capacity Bar */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-4 min-w-[260px]">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1.5 font-semibold">
              <span className="text-slate-600">Bay Occupancy:</span>
              <span className="text-blue-700">{occupiedCount} of 4 Active ({occupancyPercentage}%)</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  occupancyPercentage >= 75 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Physical Bays Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {baysData.map((bay) => {
          const isOccupied = bay.status === 'OCCUPIED';

          return (
            <div
              key={bay.id}
              className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                isOccupied
                  ? 'bg-white border-blue-300 shadow-xs'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Bay Top Row */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isOccupied
                          ? 'bg-blue-600 text-white font-black shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {bay.bayNumber}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{bay.name}</h3>
                      <p className="text-[11px] text-slate-500">{bay.liftType}</p>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${
                      isOccupied
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOccupied ? 'bg-blue-600 animate-pulse' : 'bg-emerald-600'
                      }`}
                    />
                    {isOccupied ? 'In Service' : 'Vacant'}
                  </span>
                </div>

                {/* Bay Body Content */}
                <div className="py-4 space-y-3">
                  {isOccupied ? (
                    <>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-700">
                            #{bay.activeTicketCode}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200">
                            Stage {bay.stage} of 5
                          </span>
                        </div>

                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <Bike className="w-3.5 h-3.5 text-blue-600" />
                            <span>{bay.bikeModel}</span>
                          </div>
                          <div className="text-xs font-mono text-slate-500 mt-0.5">
                            Plate: <span className="text-slate-800 font-bold">{bay.plateNumber}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 text-xs">
                          <div className="text-slate-500">
                            Package: <span className="text-slate-800 font-medium">{bay.serviceType}</span>
                          </div>
                          <div className="text-slate-500 mt-1 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Mechanic: </span>
                            <span className="text-emerald-700 font-semibold">{bay.assignedMechanic}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-50/60 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-500 space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500/60 mx-auto mb-1" />
                      <div className="text-xs font-semibold text-slate-700">Lift Available</div>
                      <p className="text-[11px] text-slate-500">
                        Handa para sa susunod na unit mula sa intake queue.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bay Bottom Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                {isOccupied && bay.activeTicket ? (
                  <button
                    type="button"
                    onClick={() => onOpenDispatch(bay.activeTicket!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-2xs"
                  >
                    <span>Manage Dispatch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Ready for Intake Dispatch
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Workshop Mechanics Duty Roster */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Technician Duty Roster</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Shift: 8:00 AM – 6:00 PM</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MECHANICS.map((mech) => (
            <div
              key={mech.id}
              className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{mech.nickname}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  On Duty
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">{mech.specialty}</p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {mech.phone}
                </span>
                <span className="text-emerald-700 font-semibold">
                  {mech.completedJobsToday} jobs today
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
