// src/data/connectors.ts
export type ConnectorSpec = { family: string; contA: number; burstA: number };
export const CONNECTORS: ConnectorSpec[] = [
  { family: "XT30",  contA: 30,  burstA: 40 },
  { family: "Deans", contA: 60,  burstA: 75 },
  { family: "XT60",  contA: 60,  burstA: 80 },
  { family: "XT90",  contA: 90,  burstA: 120 },
  { family: "QS8",   contA: 200, burstA: 300 }
];
export function getConnector(family: string) {
  return CONNECTORS.find(c => c.family.toLowerCase() === family.toLowerCase());
}
