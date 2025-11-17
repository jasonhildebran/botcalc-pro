// src/types.ts
export type Candidate = {
  candidateName?: string;
  season?: number;
  motor: {
    type: "BLDC";
    name: string;
    kv?: number;
    kt?: number;
    nominalVoltageV: number;
    noLoadRpm: number;
    noLoadCurrentA: number;
    maxContinuousCurrentA?: number;
    mass_g?: number;
    poles?: number;
  };
  esc: {
    name: string;
    supportedCellsMin: number;
    supportedCellsMax: number;
    continuousCurrentA: number;
    burstCurrentA?: number;
    burstSeconds?: number;
    erpmLimit?: number;
    becVoltageV?: number;
    becCurrentA?: number;
  };
  battery: {
    chemistry: "LiPo" | string;
    cellsS: number;
    nominalVoltageV: number;
    capacity_mAh: number;
    cCont?: number;
    cBurst?: number;
    internalResistance_mOhmPerCell?: number;
  };
  drivetrain: {
    wheelDiameter_in: number;
    gearRatio: number;
    motorCount: number;
    robotMass_lb: number;
  };
  notes?: string;
};
