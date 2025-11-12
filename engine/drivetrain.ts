// engine/drivetrain.ts
import { makeTorqueSpeed, ktToKv } from "./motor";

// circumference in meters from wheel diameter in inches
function wheelCircumference_m(wheel_diameter_in: number) {
  const d_m = wheel_diameter_in * 0.0254;
  return Math.PI * d_m;
}

export function topSpeed(params: {
  wheel_diameter_in: number; gear_ratio: number; V: number;
  motor: { Kt: number; R: number };
}) {
  const { wheel_diameter_in, gear_ratio, V, motor } = params;
  const kv = ktToKv(motor.Kt);
  const rpm_motor = kv * V; // no-load approx
  const rpm_wheel = rpm_motor / gear_ratio;
  const mps = (rpm_wheel / 60) * wheelCircumference_m(wheel_diameter_in);
  const mph = mps * 2.23694;
  return Math.max(0, mph);
}

export function currentAtSpeed(params: {
  target_mph: number; wheel_diameter_in: number; gear_ratio: number; V: number;
  motor: { Kt: number; R: number };
}) {
  const { target_mph, wheel_diameter_in, gear_ratio, V, motor } = params;
  const target_mps = target_mph / 2.23694;
  const rpm_wheel = (target_mps / wheelCircumference_m(wheel_diameter_in)) * 60;
  const rpm_motor = rpm_wheel * gear_ratio;
  const ts = makeTorqueSpeed({ Kt: motor.Kt, R: motor.R, V });
  // crude: assume small torque to maintain speed; refine later
  const point = ts(0.05); // 0.05 N·m placeholder
  return point.current;
}
