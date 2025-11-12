import { describe, it, expect } from "vitest";
import { kvToKt, ktToKv } from "../src/engine/motor";

describe("smoke", () => {
  it("kv<->kt round trip within 1%", () => {
    const kv = 1900;
    const kt = kvToKt(kv);
    const kv2 = ktToKv(kt);
    expect(Math.abs(kv2 - kv) / kv).toBeLessThan(0.01);
  });
});
