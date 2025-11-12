import { describe, it, expect } from "vitest";
import { summarizeEsc, EscSpec } from "../src/engine/esc";

const baseEsc: EscSpec = {
  cellsMin: 2,
  cellsMax: 4,
  contCurrentA: 60,
  burstCurrentA: 80,
  erpmLimit: 200000,
  becVoltageV: 5,
  becCurrentA: 3
};

describe("esc rules", () => {
  it("4S battery with ESC 2–3S should FAIL voltage", () => {
    const esc: EscSpec = { ...baseEsc, cellsMax: 3 }; // 2–3S only
    const bat = { cellsS: 4, chargedVoltageV: 16.8 };
    const demand = { predictedContA: 30, predictedBurstA: 50, predictedErpm: 100000, becLoadA: 0.5 };
    const res = summarizeEsc(esc, bat, demand);
    expect(res.overall).toBe("FAIL");
    expect(res.reasons.some(r => r.category === "Voltage" && r.level === "FAIL")).toBe(true);
  });

  it("continuous current near limit should WARN; above limit should FAIL", () => {
    const esc = baseEsc;
    const bat = { cellsS: 3, chargedVoltageV: 12.6 };
    const warnDemand = { predictedContA: 55, predictedBurstA: 60, predictedErpm: 100000, becLoadA: 0.5 };
    const warnRes = summarizeEsc(esc, bat, warnDemand, { contHeadroom: 0.15 });
    expect(warnRes.overall).toBe("WARN");

    const failDemand = { predictedContA: 65, predictedBurstA: 60, predictedErpm: 100000, becLoadA: 0.5 };
    const failRes = summarizeEsc(esc, bat, failDemand);
    expect(failRes.overall).toBe("FAIL");
  });

  it("ERPM over limit should FAIL", () => {
    const esc = baseEsc;
    const bat = { cellsS: 3, chargedVoltageV: 12.6 };
    const demand = { predictedContA: 30, predictedBurstA: 50, predictedErpm: 250000, becLoadA: 0.5 };
    const res = summarizeEsc(esc, bat, demand);
    expect(res.overall).toBe("FAIL");
    expect(res.reasons.some(r => r.category === "ERPM/Speed" && r.level === "FAIL")).toBe(true);
  });

  it("BEC undersized should FAIL; high usage should WARN", () => {
    const esc = baseEsc;
    const bat = { cellsS: 3, chargedVoltageV: 12.6 };

    const warnDemand = { predictedContA: 10, predictedBurstA: 20, predictedErpm: 100000, becLoadA: 2.8 }; // ~93% of 3A
    const warnRes = summarizeEsc(esc, bat, warnDemand);
    expect(warnRes.overall).toBe("WARN");

    const failDemand = { predictedContA: 10, predictedBurstA: 20, predictedErpm: 100000, becLoadA: 3.5 }; // >3A
    const failRes = summarizeEsc(esc, bat, failDemand);
    expect(failRes.overall).toBe("FAIL");
  });
});
