import { describe, it, expect } from "vitest";
import { suggestFuse, needsAntiSpark, checkConnector, summarizeProtection } from "../src/engine/protection";

describe("protection & connectors", () => {
  it("sizes fuse at ~125% of continuous", () => {
    expect(suggestFuse({ contA: 60 }).ratingA).toBe(75);
  });

  it("recommends anti-spark at ≥4S charged voltage", () => {
    expect(needsAntiSpark({ chargedVoltageV: 16.8 })).toBe(true);
    expect(needsAntiSpark({ chargedVoltageV: 12.6 })).toBe(false);
  });

  it("connector headroom: XT60 fail at 80A cont, pass at 40A", () => {
    expect(checkConnector({ family: "XT60", contA: 80, burstA: 90 }).verdict).toBe("FAIL");
    expect(checkConnector({ family: "XT60", contA: 40, burstA: 60 }).verdict).toBe("PASS");
  });

  it("summary bundles outputs", () => {
    const res = summarizeProtection({ system: { chargedVoltageV: 16.8 }, demand: { contA: 50, burstA: 80 }, connector: { family: "XT90" } });
    expect(res.fuse.ratingA).toBe(63); // ceil(50*1.25)
    expect(res.antiSpark).toBe(true);
    expect(res.connector.verdict).toBe("PASS");
  });
});
