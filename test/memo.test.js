// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, auditRisk, urlSafe, findNumber, render } from "../src/memo.js";
import { costOf } from "../src/intel.js";
import { checkAddress } from "../src/onchain.js";

const base = { address: "0x1296da72914EA99a6Ac0D0c94Afba2D890dFA25b", isContract: true, codeSize: 6526, owner: null, proxyImplementation: null,
  cekAman: { safe: 2, scam: 0, proofSafe: 1, proofScam: 0, status: "safe" } };
const okAudit = { audit: { ok: true, intent: "SMART_CONTRACT_AUDIT_GENERAL", answer: { risk_level: "low" }, cost_usd: 0.1 } };

test("clean verified contract with low-risk paid audit is SAFE and cost is summed", () => {
  const d = decide(base, okAudit, { match: "exact_match" });
  assert.equal(d.verdict, "SAFE"); assert.equal(d.cost_usd, 0.1);
});
test("wallet address (no code) is BLOCK", () => {
  assert.equal(decide({ ...base, isContract: false, codeSize: 0 }, {}, {}).verdict, "BLOCK");
});
test("proof-backed SCAM report from Agent ID holders is BLOCK", () => {
  const f = { ...base, cekAman: { safe: 5, scam: 1, proofSafe: 0, proofScam: 1 } };
  assert.equal(decide(f, okAudit, { match: "exact_match" }).verdict, "BLOCK");
});
test("unverified source or proxy is CAUTION", () => {
  assert.equal(decide(base, okAudit, { match: null }).verdict, "CAUTION");
  assert.equal(decide({ ...base, proxyImplementation: "0x0000000000000000000000000000000000000001" }, okAudit, { match: "exact_match" }).verdict, "CAUTION");
});
test("failure case: escrow empty (402) never yields SAFE", () => {
  const intel = { audit: { ok: false, intent: "SMART_CONTRACT_AUDIT_GENERAL", answer: { status: 402, error: "payment required" }, cost_usd: 0 } };
  const d = decide(base, intel, { match: "exact_match" });
  assert.equal(d.verdict, "CAUTION"); assert.equal(d.cost_usd, 0);
  assert.ok(d.reasons.some((r) => r.includes("free checks only")));
});
test("high-risk audit and phishing URL are BLOCK", () => {
  assert.equal(decide(base, { audit: { ok: true, answer: "Risk level: HIGH, owner can drain" } }, { match: "exact_match" }).verdict, "BLOCK");
  assert.equal(decide(base, { ...okAudit, url: { ok: true, answer: { safe: false } } }, { match: "exact_match" }).verdict, "BLOCK");
});
test("parsers", () => {
  assert.equal(auditRisk({ severity: "medium" }), "medium");
  assert.equal(auditRisk("no issues found, low risk"), "low");
  assert.equal(urlSafe({ answer: { safe: true } }), true);
  assert.equal(findNumber({ a: { holders_count: 7 } }, "holders_count"), 7);
  assert.equal(costOf({ fulfillment: { payments: [{ amount_usdc: "0.01" }, { micro_usdc: 10000 }] } }), 0.02);
});
test("bad address input is rejected", () => {
  assert.throws(() => checkAddress("0x123"), /Not a valid/);
  assert.match(render(base.address, decide(base, okAudit, { match: "exact_match" }), "testnet"), /VERDICT: SAFE/);
});

import { decide as _decideFb } from "../src/memo.js";
import { test as _tFb } from "node:test";
import _assertFb from "node:assert/strict";
_tFb("general-model fallback audit cannot BLOCK on its own", () => {
  const facts = { isContract: true, owner: null, proxyImplementation: null, cekAman: { safe: 1, scam: 0, proofSafe: 1, proofScam: 0, status: "safe" } };
  const intel = { audit: { ok: true, intent: "SMART_CONTRACT_AUDIT_GENERAL", answer: { answer: "Risk Level: High", warnings: ["no miner could answer this, so it was answered by a general model"] } } };
  const d = _decideFb(facts, intel, { match: "exact_match" });
  _assertFb.equal(d.verdict, "CAUTION");
});
