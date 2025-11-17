// src/engine/compatibility.ts
export type Verdict = "PASS" | "WARN" | "FAIL";
export type Reason = { category: string; level: Verdict; message: string };

export function aggregate(reasons: Reason[]) {
  let overall: Verdict = "PASS";
  for (const r of reasons) {
    if (r.level === "FAIL") { overall = "FAIL"; break; }
    if (r.level === "WARN") { overall = overall === "PASS" ? "WARN" : overall; }
  }
  // stable category ordering by name
  const ordered = [...reasons].sort((a,b) => a.category.localeCompare(b.category));
  return { overall, reasons: ordered };
}
