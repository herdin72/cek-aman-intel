// SPDX-License-Identifier: MIT
// Paid intelligence bought through the Telegraph network (testnet escrow, ~$0.01 per miner answer).
export const ASKS = (f, opts) => [
  { key: "audit", intent: "SMART_CONTRACT_AUDIT_GENERAL",
    question: `Security review of the verified-or-not smart contract at ${f.address} on BNB Smart Chain (chain id 56). ` +
      `It is a free "claim"/mint contract. Does it have owner-only drain/withdraw, mint-to-self, blacklist, fee-on-transfer, ` +
      `unlimited approval requests, or upgradeable proxy risks? Answer with risk level (low/medium/high) and the main findings.` },
  { key: "holders", intent: "TOKEN_HOLDER_COUNT_GENERAL", params: { token: f.address, chain: "bsc" } },
  ...(opts.url ? [{ key: "url", intent: "URL_SCAN_VERDICT", params: { url: opts.url } }] : []),
];

export async function buyIntel(tg, facts, opts = {}) {
  const out = {};
  for (const a of ASKS(facts, opts)) {
    const args = { intent: a.intent, ...(a.params ? { params: a.params } : { question: a.question }) };
    try {
      const r = await tg.call("telegraph_ask", args);
      out[a.key] = { intent: a.intent, ok: !r.isError, answer: r.data, cost_usd: costOf(r.data) };
    } catch (e) {
      out[a.key] = { intent: a.intent, ok: false, answer: String(e.message || e), cost_usd: 0 };
    }
  }
  return out;
}

// Sum billed payments from the reply's fulfillment block, whatever shape the node used.
export function costOf(d) {
  if (!d || typeof d !== "object") return 0;
  const pays = d.fulfillment?.payments || d.payments || [];
  let usd = 0;
  for (const p of pays) {
    if (typeof p.usd === "number") usd += p.usd;
    else if (p.amount_usdc != null) usd += Number(p.amount_usdc);
    else if (p.price_usdc != null) usd += Number(p.price_usdc);
    else if (p.micro_usdc != null || p.amount_micro_usdc != null) usd += Number(p.micro_usdc ?? p.amount_micro_usdc) / 1e6;
  }
  if (!usd && typeof d.payment?.billed_usd === "number") usd = d.payment.billed_usd;
  if (!usd && typeof d.cost_usd === "number") usd = d.cost_usd;
  if (!usd && typeof d.paid_usd === "number") usd = d.paid_usd;
  return Math.round(usd * 1e6) / 1e6;
}
