// src/engine/system.ts
import { Candidate } from "../types";
import { kvToKt, ktToKv, estimatePhaseResistance, makeTorqueSpeed } from "./motor";
import { continuousCurrent, burstCurrent, sagFromIR, sagFromC } from "./battery";
import { topSpeed_mph, currentAtSpeed_perMotor } from "./drivetrain";
import { summarizeEsc, EscSpec } from "./esc";
import { recommendBatteryLeads } from "./wiring";
import { summarizeProtection } from "./protection";
import { aggregate, Verdict, Reason } from "./compatibility";

export type SystemReport = {
  overall: Verdict;
  reasons: Reason[];
  computed: {
    motor: { Kt: number; Kv: number; R_est: number };
    battery: {
      I_cont_max: number; I_burst_max: number;
      sagV_at_cont: number; chargedV: number; nominalV: number;
    };
    drivetrain: { topSpeed_nom_mph: number; topSpeed_sag_mph: number };
    esc: ReturnType<typeof summarizeEsc>;
    wiring: ReturnType<typeof recommendBatteryLeads>;
    protection: ReturnType<typeof summarizeProtection>;
  };
};

export function buildReport(c: Candidate): SystemReport {
  // --- Motor derivations
  const Kv = c.motor.kv ?? (c.motor.kt ? ktToKv(c.motor.kt) : 1900);
  const Kt = c.motor.kt ?? kvToKt(Kv);
  const R_est = estimatePhaseResistance({
    Kv, V_nom: c.motor.nominalVoltageV,
    RPM_no_load: c.motor.noLoadRpm,
    I_no_load: c.motor.noLoadCurrentA
  });

  // --- Battery limits & sag
  const chargedV = c.battery.cellsS * 4.2;
  const nominalV = c.battery.nominalVoltageV;
  const I_cont_max = c.battery.cCont ? continuousCurrent(c.battery.capacity_mAh, c.battery.cCont) : 0;
  const I_burst_max = c.battery.cBurst ? burstCurrent(c.battery.capacity_mAh, c.battery.cBurst) : I_cont_max;

  const sagByIR = c.battery.internalResistance_mOhmPerCell != null
    ? sagFromIR({ S: c.battery.cellsS, IR_per_cell_mΩ: c.battery.internalResistance_mOhmPerCell, I_load: Math.max(1, I_cont_max) })
    : null;
  const sagV_at_cont = sagByIR
    ? Math.min(chargedV - 0.1, sagByIR.V_drop)
    : sagFromC({ capacity_mAh: c.battery.capacity_mAh, C_cont: c.battery.cCont ?? 10, I_load: Math.max(1, I_cont_max), S: c.battery.cellsS }).V_drop;

  // --- Drivetrain (top speed)
  const motorModel = { Kt, R: R_est };
  const topSpeed_nom_mph = topSpeed_mph({
    wheel_diameter_in: c.drivetrain.wheelDiameter_in,
    gear_ratio: c.drivetrain.gearRatio,
    V: nominalV,
    motor: motorModel
  });
  const topSpeed_sag_mph = topSpeed_mph({
    wheel_diameter_in: c.drivetrain.wheelDiameter_in,
    gear_ratio: c.drivetrain.gearRatio,
    V: Math.max(0, nominalV - sagV_at_cont),
    motor: motorModel
  });

  // Rough demand estimates (cruise at 10 mph, arbitrary for checks)
  const cruise_mph = Math.min(10, topSpeed_nom_mph * 0.6);
  const perMotorCruiseA = currentAtSpeed_perMotor({
    target_mph: cruise_mph,
    wheel_diameter_in: c.drivetrain.wheelDiameter_in,
    gear_ratio: c.drivetrain.gearRatio,
    V: nominalV,
    motor: motorModel
  });
  const predictedContA = Math.max(1, perMotorCruiseA * c.drivetrain.motorCount);
  const predictedBurstA = Math.max(predictedContA * 1.5, 1);

  // ERPM estimate
  const poles = c.motor.poles ?? 14;
  const kv_rpm_per_v = Kv;
  const predictedErpm = kv_rpm_per_v * chargedV * (poles / 2);

  // --- ESC rules
  const escSpec: EscSpec = {
    cellsMin: c.esc.supportedCellsMin,
    cellsMax: c.esc.supportedCellsMax,
    absMaxVoltageV: undefined,
    contCurrentA: c.esc.continuousCurrentA,
    burstCurrentA: c.esc.burstCurrentA,
    burstSeconds: c.esc.burstSeconds,
    erpmLimit: c.esc.erpmLimit,
    becVoltageV: c.esc.becVoltageV,
    becCurrentA: c.esc.becCurrentA
  };
  const escSummary = summarizeEsc(
    escSpec,
    { cellsS: c.battery.cellsS, chargedVoltageV: chargedV },
    { predictedContA, predictedBurstA, predictedErpm, becLoadA: 0.5 }
  );

  // --- Wiring (battery leads)
  const wiring = recommendBatteryLeads({
    currentA: predictedContA,
    oneWayLength_ft: 1.5,            // default path length; will be user-editable in UI
    systemVoltageV: nominalV
  });

  // --- Protection/connectors
  const protection = summarizeProtection({
    system: { chargedVoltageV: chargedV },
    demand: { contA: predictedContA, burstA: predictedBurstA },
    connector: { family: "XT60" }    // default; will be user-selectable
  });

  // --- Aggregate reasons
  const allReasons: Reason[] = [
    ...escSummary.reasons,
    { category: "Wiring", level: "PASS", message: `${wiring.awg} drop ${wiring.dropPct.toFixed(2)}%` },
    { category: "Protection", level: protection.connector.verdict as any, message: protection.connector.reason }
  ];
  const agg = aggregate(allReasons);

  return {
    overall: agg.overall,
    reasons: agg.reasons,
    computed: {
      motor: { Kt, Kv, R_est },
      battery: { I_cont_max, I_burst_max, sagV_at_cont, chargedV, nominalV },
      drivetrain: { topSpeed_nom_mph, topSpeed_sag_mph },
      esc: escSummary,
      wiring,
      protection
    }
  };
}
