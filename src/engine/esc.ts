// src/engine/esc.ts

export type Verdict = "PASS" | "WARN" | "FAIL";

export interface EscSpec {
  cellsMin: number;
  cellsMax: number;
  absMaxVoltageV?: number;
  contCurrentA: number;
  burstCurrentA?: number;
  burstSeconds?: number;
  erpmLimit?: number;
  becVoltageV?: number;
  becCurrentA?: number;
}

export interface BatteryInfo {
  cellsS: number;
  chargedVoltageV: number;
}

export interface DemandInfo {
  predictedContA: number;
  predictedBurstA: number;
  predictedErpm: number;
  becLoadA: number;
}

export interface Thresholds {
  contHeadroom?: number;  // default 15%
  burstHeadroom?: number; // default 10%
  erpmHeadroom?: number;  // default 10%
}

export type Reason = { category: string; level: Verdict; message: string };

function push(reasons: Reason[], category: string, level: Verdict, message: string) {
  reasons.push({ category, level, message });
}

export function checkVoltage(esc: EscSpec, bat: BatteryInfo, reasons: Reason[]) {
  // Cell-range check
  if (bat.cellsS < esc.cellsMin || bat.cellsS > esc.cellsMax) {
    push(
      reasons,
      "Voltage",
      "FAIL",
      `Battery ${bat.cellsS}S outside ESC range ${esc.cellsMin}–${esc.cellsMax}S.`
    );
  }
  // Absolute voltage check (if present)
  if (esc.absMaxVoltageV !== undefined && bat.chargedVoltageV > esc.absMaxVoltageV) {
    push(
      reasons,
      "Voltage",
      "FAIL",
      `Charged pack ${bat.chargedVoltageV.toFixed(2)}V exceeds ESC abs max ${esc.absMaxVoltageV.toFixed(2)}V.`
    );
  }
}

export function checkCurrent(
  esc: EscSpec,
  demand: DemandInfo,
  reasons: Reason[],
  t: Thresholds = {}
) {
  const contHeadroom = t.contHeadroom ?? 0.15;
  const warnThreshold = esc.contCurrentA * (1 - contHeadroom);

  if (demand.predictedContA > esc.contCurrentA) {
    push(
      reasons,
      "Current/Thermal",
      "FAIL",
      `Predicted continuous ${demand.predictedContA.toFixed(1)}A exceeds ESC ${esc.contCurrentA.toFixed(1)}A.`
    );
  } else if (demand.predictedContA > warnThreshold) {
    const pct = (demand.predictedContA / esc.contCurrentA) * 100;
    push(
      reasons,
      "Current/Thermal",
      "WARN",
      `Continuous ${demand.predictedContA.toFixed(1)}A is ${pct.toFixed(0)}% of ESC ${esc.contCurrentA.toFixed(1)}A; target ≥ ${(contHeadroom*100).toFixed(0)}% headroom.`
    );
  }

  if (esc.burstCurrentA !== undefined) {
    if (demand.predictedBurstA > esc.burstCurrentA) {
      push(
        reasons,
        "Current/Thermal",
        "WARN",
        `Burst ${demand.predictedBurstA.toFixed(1)}A exceeds ESC burst ${esc.burstCurrentA.toFixed(1)}A.`
      );
    }
  }
}

export function checkErpm(
  esc: EscSpec,
  demand: DemandInfo,
  reasons: Reason[],
  t: Thresholds = {}
) {
  if (esc.erpmLimit === undefined) return;
  const erpmHeadroom = t.erpmHeadroom ?? 0.10;
  const warnThreshold = esc.erpmLimit * (1 - erpmHeadroom);

  if (demand.predictedErpm > esc.erpmLimit) {
    push(
      reasons,
      "ERPM/Speed",
      "FAIL",
      `Predicted ERPM ~${Math.round(demand.predictedErpm)} exceeds ESC limit ${esc.erpmLimit}.`
    );
  } else if (demand.predictedErpm > warnThreshold) {
    push(
      reasons,
      "ERPM/Speed",
      "WARN",
      `Predicted ERPM near limit (${Math.round(demand.predictedErpm)} vs ${esc.erpmLimit}).`
    );
  }
}

export function checkBec(esc: EscSpec, demand: DemandInfo, reasons: Reason[]) {
  if (esc.becCurrentA === undefined) return;
  if (demand.becLoadA > esc.becCurrentA) {
    push(
      reasons,
      "Signal/Control",
      "FAIL",
      `BEC load ${demand.becLoadA.toFixed(1)}A exceeds BEC ${esc.becCurrentA.toFixed(1)}A.`
    );
  } else {
    const pct = (demand.becLoadA / esc.becCurrentA) * 100;
    if (pct > 90) {
      push(
        reasons,
        "Signal/Control",
        "WARN",
        `BEC load ${demand.becLoadA.toFixed(1)}A is ${pct.toFixed(0)}% of BEC ${esc.becCurrentA.toFixed(1)}A.`
      );
    }
  }
}

export function summarizeEsc(
  esc: EscSpec,
  bat: BatteryInfo,
  demand: DemandInfo,
  thresholds?: Thresholds
) {
  const reasons: Reason[] = [];
  checkVoltage(esc, bat, reasons);
  checkCurrent(esc, demand, reasons, thresholds);
  checkErpm(esc, demand, reasons, thresholds);
  checkBec(esc, demand, reasons);

  // Overall = worst of the reasons; if none, PASS.
  let overall: Verdict = "PASS";
  for (const r of reasons) {
    if (r.level === "FAIL") { overall = "FAIL"; break; }
    if (r.level === "WARN") { overall = overall === "PASS" ? "WARN" : overall; }
  }
  return { overall, reasons };
}
