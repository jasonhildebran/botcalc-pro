// engine/motor.ts
// Stubbed signatures for the motor math module. We'll implement logic in a later ticket.

export function kvToKt(kv_rpm_per_volt: number): number {
  // SI approx: Kt [N·m/A] ≈ 60 / (2π * Kv[rpm/V])
  return 60 / (2 * Math.PI * kv_rpm_per_volt);
}

export function ktToKv(kt_nm_per_amp: number): number {
  return 60 / (2 * Math.PI * kt_nm_per_amp);
}

export function estimatePhaseResistance(params: {
  Kv?: number; Kt?: number;
  V_nom: number; RPM_no_load: number; I_no_load: number;
}): number {
  // Placeholder: real inference comes later. Return a conservative small number so downstream math doesn't NaN.
  // TODO: implement using Kv, V_nom, and no-load point consistency.
  return 0.05; // ohms (temporary)
}

export function makeTorqueSpeed(params: {
  Kt: number; R: number; V: number;
}) {
  const { Kt, R, V } = params;
  return function (torque_nm: number) {
    // Placeholder linear model; to be refined.
    const current = torque_nm / Kt;
    const backEmfV = V - current * R;
    const kv = ktToKv(Kt);
    const rpm = Math.max(0, backEmfV * kv);
    const P_shaft = (torque_nm * (rpm * 2 * Math.PI / 60));
    const P_elec = current * V;
    const eff = P_elec > 0 ? Math.max(0, Math.min(1, P_shaft / P_elec)) : 0;
    return { rpm, current, P_shaft, P_elec, eff };
  };
}

export function erpm(params: { rpm: number; poles?: number }) {
  const poles = params.poles ?? 14; // default common BLDC pole count; override as needed
  return params.rpm * (poles / 2);
}
