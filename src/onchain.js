// SPDX-License-Identifier: MIT
// Free, read-only BSC checks: bytecode, owner(), EIP-1967 proxy slot, Sourcify status, Cek Aman community reports.
import { createPublicClient, http, isAddress, getAddress, parseAbi } from "viem";
import { bsc } from "viem/chains";

export const CEK_AMAN = "0xcC417b42e8a7db7615bfb6bebE32143759a19c6D";
const ABI = parseAbi([
  "function getTally(address target) view returns (uint32 safe, uint32 scam, uint32 proofSafe, uint32 proofScam, uint8 status, uint40 firstReportAt, uint40 lastReportAt)",
  "function owner() view returns (address)",
]);
const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

export function client(rpc = process.env.BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org") {
  return createPublicClient({ chain: bsc, transport: http(rpc, { timeout: 20_000, retryCount: 2 }) });
}

export function checkAddress(a) {
  if (typeof a !== "string" || !isAddress(a)) throw new Error(`Not a valid EVM address: ${a}`);
  return getAddress(a);
}

export async function sourcify(address, chainId = 56, fetchImpl = fetch) {
  try {
    const r = await fetchImpl(`https://sourcify.dev/server/v2/contract/${chainId}/${address}`, { signal: AbortSignal.timeout(15_000) });
    if (r.status === 404) return { match: null };
    const j = await r.json();
    return { match: j.match ?? null };
  } catch (e) { return { match: "unknown", error: String(e.message || e) }; }
}

export async function onchainFacts(address, c = client()) {
  const code = await c.getCode({ address });
  const codeSize = code ? (code.length - 2) / 2 : 0;
  const facts = { address, chain: "bsc", codeSize, isContract: codeSize > 0 };
  if (!facts.isContract) return facts;
  facts.owner = await c.readContract({ address, abi: ABI, functionName: "owner" }).catch(() => null);
  const slot = await c.getStorageAt({ address, slot: IMPL_SLOT }).catch(() => null);
  facts.proxyImplementation = slot && BigInt(slot) !== 0n ? getAddress("0x" + slot.slice(-40)) : null;
  const [safe, scam, proofSafe, proofScam, status] = await c.readContract({ address: CEK_AMAN, abi: ABI, functionName: "getTally", args: [address] });
  facts.cekAman = { safe, scam, proofSafe, proofScam, status: ["none", "safe", "scam", "mixed"][status] ?? String(status) };
  return facts;
}
