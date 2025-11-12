import { describe, it, expect } from "vitest";
import { topSpeed_mph, currentAtSpeed_perMotor } from "../src/engine/drivetrain";

const motor = { Kt: 60 / (2 * Math.PI * 1900), R: 0.05 }; // consistent with motor stub

describe("drivetrain", () => {
  it("higher reduction (bigger gear_ratio) lowers top speed", () => {
    const low = topSpeed_mph({ wheel_diameter_in: 3, gear_ratio: 3, V: 11.1, motor });
    const high = topSpeed_mph({ wheel_diameter_in: 3, gear_ratio: 6, V: 11.1, motor });
    expect(high).toBeLessThan(low);
  });

  it("bigger wheel raises top speed", () => {
    const small = topSpeed_mph({ wheel_diameter_in: 2.5, gear_ratio: 4, V: 11.1, motor });
    const big = topSpeed_mph({ wheel_diameter_in: 4, gear_ratio: 4, V: 11.1, motor });
    expect(big).toBeGreaterThan(small);
  });

  it("current at a fixed speed goes up with a bigger wheel (harder leverage)", () => {
    const speed = 10; // mph
    const small = currentAtSpeed_perMotor({ target_mph: speed, wheel_diameter_in: 2.5, gear_ratio: 4, V: 11.1, motor });
    const big = currentAtSpeed_perMotor({ target_mph: speed, wheel_diameter_in: 4, gear_ratio: 4, V: 11.1, motor });
    expect(big).toBeGreaterThanOrEqual(small);
  });
});
