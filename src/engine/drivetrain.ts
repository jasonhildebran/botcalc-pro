// src/engine/drivetrain.ts
import { ktToKv, makeTorqueSpeed } from "./motor";

function wheelCircumference_m(wheel_diameter_in: number) {
  const d_m = wheel_diameter_in * 0.0254;
  return Math.PI * d_m;
}

export function topSpeed_mph(params: {
  wheel_diameter_in: number; gear_ratio: number; V: number;
  motor: { Kt: number; R: number };
}) {
  const { wheel_diameter_in, gear_ratio, V, motor } = params;
  const kv = ktToKv(motor.Kt);             // rpm per volt
  const rpm_motor_nl = kv * V;              // no-load rpm
  const rpm_wheel_nl = rpm_motor_nl / gear_ratio;
  const mps = (rpm_wheel_nl / 60) * wheelCircumference_m(wheel_diameter_in);
  return mps * 2.23694;
}

export function currentAtSpeed_perMotor(params: {
  target_mph: number; wheel_diameter_in: number; gear_ratio: number; V: number;
  motor: { Kt: number; R: number };
}) {
  const { target_mph, wheel_diameter_in, gear_ratio, V, motor } = params;
  const target_mps = target_mph / 2.23694;
  const rpm_wheel = (target_mps / wheelCircumference_m(wheel_diameter_in)) * 60;
  const rpm_motor = rpm_wheel * gear_ratio;

  // Approximate the torque needed: assume small torque to overcome losses at cruise.
  const ts = makeTorqueSpeed({ Kt: motor.Kt, R: motor.R, V });
  // Pick a tiny positive torque so current is non-zero but small; refine later with load model.
  return ts(0.05).current;
}
