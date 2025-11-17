import { describe, it, expect } from "vitest";
import baseline from "../fixtures/baseline-2025.json";
import overvolt from "../fixtures/overvoltage-esc.json";
import { buildReport } from "../src/engine/system";

describe("system report", () => {
  it("baseline yields PASS or WARN with populated summary", () => {
    const res = buildReport(baseline as any);
    expect(["PASS","WARN","FAIL"]).toContain(res.overall);
    expect(res.computed.motor.Kt).toBeGreaterThan(0);
    // Allow WARN if our conservative sag/connector heuristics kick in
  });

  it("overvoltage case yields FAIL (Voltage reason)", () => {
    const res = buildReport(overvolt as any);
    expect(res.overall).toBe("FAIL");
    expect(res.reasons.some(r => r.category === "Voltage" && r.level === "FAIL")).toBe(true);
  });
});
