// src/engine/wiring.ts
import { AWG_TABLE, ohmsPerFt } from "../data/awg";

export type WireAdvice = {
  awg: string;
  vDropV: number;
  dropPct: number;
  wPerFt: number;
  reason: string;
};

export function evaluateAwg(params: {
  currentA: number;
  length_ft_roundtrip: number;
  systemVoltageV: number;
  dropTargetPct: number; // e.g. 3 for 3%
  maxWPerFt: number;     // e.g. 3 W/ft
}) {
  const { currentA, length_ft_roundtrip, systemVoltageV, dropTargetPct, maxWPerFt } = params;

  const results = AWG_TABLE.map(row => {
    const R = ohmsPerFt(row) * length_ft_roundtrip; // Ω, round-trip
    const vDrop = currentA * R;                      // V
    const dropPct = (vDrop / systemVoltageV) * 100;
    const wPerFt = (currentA * currentA) * ohmsPerFt(row); // W/ft (one-way)
    const passAmpacity = currentA <= row.ampacityA;
    const passDrop = dropPct <= dropTargetPct;
    const passW = wPerFt <= maxWPerFt;
    const passes = passAmpacity && passDrop && passW;
    return { row, vDrop, dropPct, wPerFt, passes, passAmpacity, passDrop, passW };
  });

  // Pick the thinnest (largest AWG number) that passes all constraints.
  const passing = results.filter(r => r.passes);
  if (passing.length) {
    const best = passing[0]; // table ordered from thin→thick
    return <WireAdvice>{
      awg: best.row.awg,
      vDropV: best.vDrop,
      dropPct: best.dropPct,
      wPerFt: best.wPerFt,
      reason: `Meets ampacity (${best.row.ampacityA}A), drop (${best.dropPct.toFixed(2)}%), and W/ft (${best.wPerFt.toFixed(2)}).`
    };
  }

  // None passed → choose the thickest and warn via reason.
  const worst = results[results.length - 1];
  return <WireAdvice>{
    awg: worst.row.awg,
    vDropV: worst.vDrop,
    dropPct: worst.dropPct,
    wPerFt: worst.wPerFt,
    reason: `No AWG meets all constraints; ${worst.row.awg} minimizes drop/heat (drop ${worst.dropPct.toFixed(2)}%, ${worst.wPerFt.toFixed(2)} W/ft).`
  };
}

export function recommendBatteryLeads(params: {
  currentA: number;
  oneWayLength_ft: number;
  systemVoltageV: number;
}) {
  // Defaults: 3% drop target, 3 W/ft cap for battery leads.
  return evaluateAwg({
    currentA: params.currentA,
    length_ft_roundtrip: params.oneWayLength_ft * 2,
    systemVoltageV: params.systemVoltageV,
    dropTargetPct: 3,
    maxWPerFt: 3
  });
}
