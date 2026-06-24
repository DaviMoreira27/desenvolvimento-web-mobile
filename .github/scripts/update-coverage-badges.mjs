import { readFileSync, writeFileSync } from "node:fs";

const README = "README.md";
const START = "<!-- COVERAGE-BADGES:START -->";
const END = "<!-- COVERAGE-BADGES:END -->";

const packages = [
  { label: "frontend coverage", summary: "frontend/coverage/coverage-summary.json" },
  { label: "backend coverage", summary: "backend/coverage/coverage-summary.json" },
];

function color(pct) {
  if (pct >= 90) return "brightgreen";
  if (pct >= 80) return "green";
  if (pct >= 70) return "yellowgreen";
  if (pct >= 60) return "yellow";
  if (pct >= 50) return "orange";
  return "red";
}

function badge({ label, summary }) {
  const pct = Math.round(JSON.parse(readFileSync(summary, "utf8")).total.lines.pct);
  const message = `${pct}%`;
  const part = (s) => encodeURIComponent(s).replace(/-/g, "--");
  const url = `https://img.shields.io/badge/${part(label)}-${part(message)}-${color(pct)}`;
  return `![${label}](${url})`;
}

const block = `${START}\n${packages.map(badge).join("\n")}\n${END}`;
const readme = readFileSync(README, "utf8");
const region = new RegExp(`${START}[\\s\\S]*?${END}`);

if (!region.test(readme)) {
  throw new Error(`Markers ${START} ... ${END} not found in ${README}`);
}

writeFileSync(README, readme.replace(region, block));
console.log("Updated coverage badges:\n" + block);
