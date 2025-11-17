// src/data/awg.ts
// Copper, round-trip length considered in calc outside. Ampacity here is conservative for chassis wiring.
export type AwgRow = { awg: string; ohms_per_kuft: number; ampacityA: number };
export const AWG_TABLE: AwgRow[] = [
  { awg: "18", ohms_per_kuft: 6.385, ampacityA: 7 },
  { awg: "16", ohms_per_kuft: 4.016, ampacityA: 10 },
  { awg: "14", ohms_per_kuft: 2.525, ampacityA: 15 },
  { awg: "12", ohms_per_kuft: 1.588, ampacityA: 25 },
  { awg: "10", ohms_per_kuft: 0.999, ampacityA: 40 },
  { awg: "8",  ohms_per_kuft: 0.6282, ampacityA: 55 },
  { awg: "6",  ohms_per_kuft: 0.3953, ampacityA: 75 },
  { awg: "4",  ohms_per_kuft: 0.2485, ampacityA: 95 },
  { awg: "2",  ohms_per_kuft: 0.1563, ampacityA: 130 },
  { awg: "1/0",ohms_per_kuft: 0.0983, ampacityA: 170 },
];
export function ohmsPerFt(awg: AwgRow) { return awg.ohms_per_kuft / 1000; }
