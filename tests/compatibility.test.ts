import { describe, it, expect } from "vitest";
import { aggregate } from "../src/engine/compatibility";

describe("compatibility aggregator", () => {
  it("FAIL dominates", () => {
    const res = aggregate([
      { category: "Voltage", level: "FAIL", message: "4S on 2–3S ESC" },
      { category: "Current/Thermal", level: "WARN", message: "Near cont limit" }
    ]);
    expect(res.overall).toBe("FAIL");
    expect(res.reasons[0].category).toBe("Current/Thermal"); // alphabetical order
  });

  it("WARN if any warn and no fail; PASS if all pass", () => {
    expect(aggregate([{ category: "Voltage", level: "PASS", message: "" }]).overall).toBe("PASS");
    expect(aggregate([{ category: "Voltage", level: "PASS", message: "" }, { category: "ERPM/Speed", level: "WARN", message: "" }]).overall).toBe("WARN");
  });
});
