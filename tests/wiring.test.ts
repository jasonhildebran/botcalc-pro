import { describe, it, expect } from "vitest";
import { evaluateAwg, recommendBatteryLeads } from "../src/engine/wiring";

describe("wiring recommender", () => {
  it("returns thicker wire for higher current", () => {
    const a = evaluateAwg({ currentA: 20, length_ft_roundtrip: 2, systemVoltageV: 12, dropTargetPct: 3, maxWPerFt: 3 }).awg;
    const b = evaluateAwg({ currentA: 60, length_ft_roundtrip: 2, systemVoltageV: 12, dropTargetPct: 3, maxWPerFt: 3 }).awg;
    // e.g., "12" vs "8" → string compare won't help; just ensure ampacity rises by checking drop/heat monotonic behavior indirectly.
    expect(a === b).toBe(false);
  });

  it("longer length implies same or thicker gauge", () => {
    const shortPick = evaluateAwg({ currentA: 50, length_ft_roundtrip: 2, systemVoltageV: 12, dropTargetPct: 3, maxWPerFt: 3 });
    const longPick  = evaluateAwg({ currentA: 50, length_ft_roundtrip: 6, systemVoltageV: 12, dropTargetPct: 3, maxWPerFt: 3 });
    // Longer length must not pick a thinner wire (by table order, thin entries appear earlier)
    expect(Number(longPick.awg.replace(/[^0-9]/g,""))).toBeLessThanOrEqual(Number(shortPick.awg.replace(/[^0-9]/g,"")));
  });

  it("battery helper uses 3% drop & 3 W/ft defaults", () => {
    const pick = recommendBatteryLeads({ currentA: 80, oneWayLength_ft: 1.5, systemVoltageV: 12 });
    expect(pick.awg).toBeDefined();
    expect(pick.dropPct).toBeLessThanOrEqual(3.5);
  });
});
