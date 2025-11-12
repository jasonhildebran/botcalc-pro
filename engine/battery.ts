// engine/battery.ts
export function continuousCurrent(capacity_mAh: number, C_cont: number): number {
  // A = (mAh/1000) * C
  return (capacity_mAh / 1000) * C_cont;
}

export function burstCurrent(capacity_mAh: number, C_burst?: number): number {
  if (!C_burst) return continuousCurrent(capacity_mAh, 1); // conservative default
  return (capacity_mAh / 1000) * C_burst;
}

export function sagFromIR(params: { S: number; IR_per_cell_mΩ: number; I_load: number }) {
  const { S, IR_per_cell_mΩ, I_load } = params;
  const R_total = (IR_per_cell_mΩ / 1000) * S; // Ω
  const V_drop = I_load * R_total;
  return { V_drop, R_total };
}

// Fallback when IR isn't given. Conservative heuristic using C rating.
export function sagFromC(params: { capacity_mAh: number; C_cont: number; I_load: number }) {
  const { capacity_mAh, C_cont, I_load } = params;
  const I_cont = continuousCurrent(capacity_mAh, C_cont);
  // If load exceeds cont, assume big drop; else small drop.
  const ratio = I_cont > 0 ? Math.min(1, I_load / I_cont) : 1;
  const V_drop = 0.12 + 0.08 * ratio; // crude, conservative: 120–200 mV per cell equivalent
  return { V_drop_per_cell: V_drop };
}

export function runtimeAt(params: { capacity_mAh: number; I_avg: number; duty: number }) {
  const { capacity_mAh, I_avg, duty } = params;
  const Ah = capacity_mAh / 1000;
  const effectiveI = I_avg * duty;
  if (effectiveI <= 0) return Infinity;
  const hours = Ah / effectiveI;
  return hours * 60; // minutes
}
