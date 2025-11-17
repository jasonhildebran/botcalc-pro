import { describe, it, expect } from "vitest";
import baseline from "../fixtures/baseline-2025.json";
import { buildReport } from "../src/engine/system";

describe("cli smoke via system", () => {
  it("buildReport returns an overall", () => {
    const res = buildReport(baseline as any);
    expect(["PASS","WARN","FAIL"]).toContain(res.overall);
  });
});
