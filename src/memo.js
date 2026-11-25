// SPDX-License-Identifier: MIT
// Pure decision logic: facts + paid intel -> SAFE / CAUTION / BLOCK memo. No network, so it is unit-tested.
const RANK = { SAFE: 0, CAUTION: 1, BLOCK: 2 };
const worse = (a, b) => (RANK[b] > RANK[a] ? b : a);

export function auditRisk(answer) {
  if (answer == null) return null;
  const s = (typeof answer === "string" ? answer : JSON.stringify(answer)).toLowerCase();
  const m = s.match(/"?(risk[_ ]?level|severity|risk)"?\s*[:=]\s*"?(critical|high|medium|moderate|low|none|safe)/);
  const lvl = m ? m[2] : /\b(critical|high[- ]risk|drain|rug)\b/.test(s) ? "high" : /\bmedium|moderate\b/.test(s) ? "medium" : /\blow\b|no (major )?issues/.test(s) ? "low" : null;
  return { critical: "high", high: "high", medium: "medium", moderate: "medium", low: "low", none: "low", safe: "low" }[lvl] ?? null;
}

export function urlSafe(answer) {
  if (answer == null) return null;
  const v = answer?.answer?.safe ?? answer?.safe ?? answer?.result?.safe;
  if (typeof v === "boolean") return v;
  const s = JSON.stringify(answer).toLowerCase();
  if (/"safe"\s*:\s*false/.test(s)) return false;
  if (/"safe"\s*:\s*true/.test(s)) return true;
  return null;
}

export function decide(facts, intel = {}, src = {}) {
  let verdict = "SAFE";
  const reasons = [], evidence = [];
  const flag = (v, why) => { verdict = worse(verdict, v); reasons.push(`${v}: ${why}`); };

  if (!facts.isContract) { flag("BLOCK", "address has no contract code on BSC (wallet or wrong address) — never send a claim tx to it"); }
  else {
    evidence.push(`bytecode ${facts.codeSize} bytes on BSC`);
    if (src.match === "exact_match" || src.match === "match") evidence.push(`Sourcify: ${src.match}`);
    else flag("CAUTION", "source code is not verified on Sourcify — nobody can read what the claim function really does");
    if (facts.proxyImplementation) flag("CAUTION", `upgradeable proxy (implementation ${facts.proxyImplementation}) — logic can change after you claim`);
    if (facts.owner && !/^0x0{40}$/i.test(facts.owner)) flag("CAUTION", `has an owner (${facts.owner}) with admin powers — check what they can do`);
    const ca = facts.cekAman;
    if (ca) {
      evidence.push(`Cek Aman community: ${ca.safe} SAFE (${ca.proofSafe} proof-backed), ${ca.scam} SCAM (${ca.proofScam} proof-backed)`);
      if (ca.proofScam > 0 || (ca.scam > 0 && ca.scam >= ca.safe)) flag("BLOCK", "Agent ID holders reported this contract as SCAM");
      else if (ca.scam > 0) flag("CAUTION", "some Agent ID holders reported SCAM");
    }
  }

  const bought = Object.values(intel).filter((x) => x && x.ok);
  if (facts.isContract && bought.length === 0) flag("CAUTION", "no paid Telegraph intelligence could be bought, so this memo uses free checks only and will not say SAFE");
  if (intel.audit?.ok) {
    const r = auditRisk(intel.audit.answer);
    evidence.push(`Telegraph ${intel.audit.intent}: risk ${r ?? "unclear"}`);
    const fallback = JSON.stringify(intel.audit.answer?.warnings || "").includes("general model");
    if (fallback) evidence.push("note: no specialist miner answered the audit ask; a general model answered, so it is treated as low-confidence (can raise CAUTION, never BLOCK)");
    if (r === "high" && fallback) flag("CAUTION", "audit answer (general model, low confidence) says high risk — check the verified source yourself");
    else if (r === "high") flag("BLOCK", "paid smart-contract audit intelligence rates it high risk");
    else if (r === "medium") flag("CAUTION", "paid audit intelligence rates it medium risk");
    else if (r == null) flag("CAUTION", "paid audit answer did not give a clear risk level");
  } else if (intel.audit) reasons.push(`note: audit ask failed (${short(intel.audit.answer)})`);
  if (intel.holders?.ok) {
    const n = findNumber(intel.holders.answer, "holders_count");
    evidence.push(`Telegraph TOKEN_HOLDER_COUNT_GENERAL: ${n ?? "unknown"} holders`);
    if (n != null && n < 20) flag("CAUTION", `only ${n} holders — very new or unused`);
  }
  if (intel.url?.ok) {
    const s = urlSafe(intel.url.answer);
    evidence.push(`Telegraph URL_SCAN_VERDICT: safe=${s}`);
    if (s === false) flag("BLOCK", "claim website flagged as unsafe/phishing");
  }
  const cost = Object.values(intel).reduce((t, x) => t + (x?.cost_usd || 0), 0);
  return { verdict, reasons, evidence, cost_usd: Math.round(cost * 1e6) / 1e6, asks: Object.keys(intel).length };
}

export function findNumber(obj, key) {
  if (obj == null || typeof obj !== "object") return null;
  if (typeof obj[key] === "number") return obj[key];
  for (const v of Object.values(obj)) { const n = findNumber(v, key); if (n != null) return n; }
  return null;
}
const short = (x) => String(typeof x === "string" ? x : JSON.stringify(x)).slice(0, 160);

export function render(address, d, network) {
  return [
    `CEK AMAN INTEL — risk memo`,
    `Contract: ${address} (BNB Smart Chain)`,
    `VERDICT: ${d.verdict}`,
    ``, `Why:`, ...(d.reasons.length ? d.reasons.map((r) => `  - ${r}`) : ["  - no risk signals found"]),
    ``, `Evidence:`, ...d.evidence.map((e) => `  - ${e}`),
    ``, `Cost: ${d.asks} Telegraph ask(s) attempted, ${d.cost_usd} test USDC billed (failed asks are never billed) — ${network}, no real money`,
    `Not financial advice. A SAFE verdict lowers risk, it does not remove it.`,
  ].join("\n");
}
