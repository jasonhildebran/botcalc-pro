// src/engine/protection.ts
import { getConnector } from "../data/connectors";

export function suggestFuse(params: { contA: number }) {
  // Size ~125% of continuous to avoid nuisance blows; slow-blow for motor loads.
  const rating = Math.ceil(params.contA * 1.25);
  return { ratingA: rating, type: "slow" as const };
}

export function needsAntiSpark(params: { chargedVoltageV: number }) {
  // Heuristic: recommend anti-spark ≥ 16.8V (4S) and strongly recommend ≥ 25V (6S).
  const v = params.chargedVoltageV;
  return v >= 16.8;
}

export function checkConnector(params: { family: string; contA: number; burstA: number }) {
  const spec = getConnector(params.family);
  if (!spec) {
    return { verdict: "WARN", reason: `Unknown connector family "${params.family}".` };
  }
  if (params.contA > spec.contA) {
    return { verdict: "FAIL", reason: `Continuous ${params.contA}A exceeds ${spec.family} ${spec.contA}A.` };
  }
  if (params.burstA > spec.burstA) {
    return { verdict: "WARN", reason: `Burst ${params.burstA}A exceeds ${spec.family} burst ${spec.burstA}A.` };
  }
  const pct = Math.round((params.contA / spec.contA) * 100);
  return { verdict: pct >= 90 ? "WARN" : "PASS", reason: `${pct}% of ${spec.family} continuous rating.` };
}

export function summarizeProtection(params: {
  system: { chargedVoltageV: number },
  demand: { contA: number; burstA: number },
  connector: { family: string }
}) {
  const fuse = suggestFuse({ contA: params.demand.contA });
  const antiSpark = needsAntiSpark({ chargedVoltageV: params.system.chargedVoltageV });
  const connector = checkConnector({ family: params.connector.family, contA: params.demand.contA, burstA: params.demand.burstA });

  return { fuse, antiSpark, connector };
}
