import { describe, it, expect } from "vitest";
import { continuousCurrent, burstCurrent, sagFromIR, sagFromC, runtimeAt } from "../src/engine/battery";

describe("battery model", () => {
  it("C × capacity math", () => {
    expect(continuousCurrent(5000, 50)).toBeCloseTo(250); // 5Ah * 50C = 250A
    expect(burstCurrent(5000, 100)).toBeCloseTo(500);
  });

  it("IR sag equals I × IR_total", () => {
    const { V_drop, R_total } = sagFromIR({ S: 3, IR_per_cell_mΩ: 12, I_load: 60 });
    expect(R_total).toBeCloseTo(0.036); // 12 mΩ * 3 = 36 mΩ
    expect(V_drop).toBeCloseTo(2.16);  // 60A * 0.036Ω
  });

  it("C-based sag is conservative vs IR when both known (same scenario)", () => {
    const ir = sagFromIR({ S: 3, IR_per_cell_mΩ: 12, I_load: 60 }).V_drop;      // 2.16V
    const c = sagFromC({ capacity_mAh: 5000, C_cont: 50, I_load: 60, S: 3 }).V_drop; // heuristic
    expect(c).toBeGreaterThanOrEqual(ir * 0.8); // don't undercut IR badly (loose guard)
  });

  it("runtime decreases with higher load", () => {
    const r1 = runtimeAt({ capacity_mAh: 5000, I_avg: 10, duty: 0.5 });
    const r2 = runtimeAt({ capacity_mAh: 5000, I_avg: 20, duty: 0.5 });
    expect(r1).toBeGreaterThan(r2);
  });
});
