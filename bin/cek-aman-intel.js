#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Usage: node bin/cek-aman-intel.js <contract-address> [--url https://claim-site] [--json] [--no-paid]
import { writeFileSync, mkdirSync } from "node:fs";
import { checkAddress, onchainFacts, sourcify } from "../src/onchain.js";
import { buyIntel } from "../src/intel.js";
import { decide, render } from "../src/memo.js";
import { connectTelegraph } from "../src/telegraph.js";

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const target = argv.find((a) => a.startsWith("0x") || !a.startsWith("--")) ;
if (!target || argv.includes("--help")) {
  console.log("Usage: node bin/cek-aman-intel.js <BSC contract address> [--url <claim website>] [--json] [--no-paid]");
  process.exit(target ? 0 : 2);
}
let address;
try { address = checkAddress(target); } catch (e) { console.error(`Error: ${e.message}`); process.exit(2); }

const [facts, src] = await Promise.all([onchainFacts(address), sourcify(address)]);
let intel = {};
if (!argv.includes("--no-paid") && facts.isContract) {
  const tg = await connectTelegraph();
  try { intel = await buyIntel(tg, facts, { url: flag("--url") }); } finally { await tg.close(); }
}
const d = decide(facts, intel, src);
const memo = render(address, d, "Telegraph testnet, Ethereum Sepolia");
mkdirSync("receipts", { recursive: true });
const file = `receipts/${new Date().toISOString().replace(/[:.]/g, "-")}-${address.slice(0, 10)}.json`;
writeFileSync(file, JSON.stringify({ address, facts, sourcify: src, intel, decision: d }, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
console.log(argv.includes("--json") ? JSON.stringify({ ...d, receipt: file }, null, 2) : `${memo}\n\nFull evidence + Telegraph replies: ${file}`);
process.exit(d.verdict === "BLOCK" ? 3 : 0);
