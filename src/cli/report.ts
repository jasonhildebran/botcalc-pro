// src/cli/report.ts
import { readFile } from "fs/promises";
import { buildReport } from "../engine/system";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npm run report -- <path-to-fixture.json>");
    process.exit(1);
  }
  const raw = await readFile(path, "utf8");
  const candidate = JSON.parse(raw);
  const report = buildReport(candidate);
  console.log(`Overall: ${report.overall}`);
  for (const r of report.reasons) {
    console.log(`- [${r.level}] ${r.category}: ${r.message}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
