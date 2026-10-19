/**
 * The 5 repair stages, named the same way the customer sees them
 * (customer dashboard and tracking page), so staff and riders talk about the same steps.
 */
export const SERVICE_STAGES = [
  { step: 1, name: 'Intake', staffHint: 'Checked in, needs a bay' },
  { step: 2, name: 'Inspect', staffHint: 'Diagnosing on the lift' },
  { step: 3, name: 'Service', staffHint: 'Repair work' },
  { step: 4, name: 'Test', staffHint: 'Quality & road test' },
  { step: 5, name: 'Ready', staffHint: 'Waiting for pickup' },
] as const;

export function stageName(step: number): string {
  return SERVICE_STAGES.find((s) => s.step === step)?.name ?? `Stage ${step}`;
}

/** Badge colors per stage, shared by the queue cards and table */
export const STAGE_BADGE_CLASS: Record<number, string> = {
  1: 'bg-blue-50 text-blue-800 border-blue-200',
  2: 'bg-amber-50 text-amber-800 border-amber-200',
  3: 'bg-orange-50 text-orange-800 border-orange-200',
  4: 'bg-purple-50 text-purple-800 border-purple-200',
  5: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};
