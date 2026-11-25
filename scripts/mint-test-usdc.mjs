// SPDX-License-Identifier: MIT
// Testnet only: mints Telegraph's own test USDC (anyone can) to the Telegraph wallet in ~/.telegraph.
// Needs a little Sepolia ETH for gas. The key is read from the wallet file and never printed.
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readWalletKey } from "@telegraphprotocol/telegraph-protocol-mcp/dist/wallet.js";
import { homedir } from "node:os"; import { join } from "node:path";
const USDC = "0xcc194e1a843B658526D0D5C431f670028582Ae17";
const amount = BigInt(Math.round(Number(process.argv[2] || 2) * 1e6));
const key = readWalletKey(process.env.TELEGRAPH_HOME || join(homedir(), ".telegraph"));
if (!key) { console.error("No Telegraph wallet. Run: npx -y @telegraphprotocol/telegraph-protocol-mcp setup"); process.exit(1); }
const account = privateKeyToAccount(key);
const rpc = http(process.env.TELEGRAPH_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com");
const pub = createPublicClient({ chain: sepolia, transport: rpc });
const eth = await pub.getBalance({ address: account.address });
if (eth === 0n) { console.error(`Wallet ${account.address} has 0 Sepolia ETH. Get some from a Sepolia faucet first.`); process.exit(1); }
const w = createWalletClient({ account, chain: sepolia, transport: rpc });
const hash = await w.writeContract({ address: USDC, abi: parseAbi(["function mint(address,uint256)"]), functionName: "mint", args: [account.address, amount] });
const r = await pub.waitForTransactionReceipt({ hash });
console.log(`mint tx ${hash} status ${r.status}. Next: npx -y @telegraphprotocol/telegraph-protocol-mcp fund ${Number(amount) / 1e6}`);
