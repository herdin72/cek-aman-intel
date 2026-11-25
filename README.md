# Cek Aman Intel

**Telegraph Hackathon Season II · Apps & Agents · Mission 01 (Exchange)**

You paste a BNB Smart Chain contract address, usually a free "claim" or mint that's going around in airdrop groups. The app pays for intelligence on the Telegraph network on its own, adds free on-chain checks and community reports from Agent ID holders, and gives you back a **SAFE / CAUTION / BLOCK** risk memo with the evidence and a cost line.

It's built for airdrop and claim hunters, who see dozens of "free mint" contracts every week. Some of them drain gas, ask for approvals, or quietly take fees.

> Hackathon disclosure: this project is an entry in the Telegraph Hackathon Season II, which has a prize pool. It runs on the **Telegraph testnet** (Ethereum Sepolia) and pays with **test USDC, not real money**.

## How it works

1. **Free checks (BSC mainnet, read-only):** it checks whether the address has contract code, its bytecode size, whether it has an `owner()`, the EIP-1967 proxy slot, and Sourcify source verification.
2. **Community proof:** it reads the [Cek Aman](https://github.com/herdin72/cek-aman) contract `0xcC417b42e8a7db7615bfb6bebE32143759a19c6D` on BSC. There, Binance Agent ID holders (one voice per Agent ID) report claim contracts as SAFE or SCAM. A report is "proof-backed" when the reporter really holds the token or NFT they claimed.
3. **Paid Telegraph intelligence:** it uses the official `@telegraphprotocol/telegraph-protocol-mcp` server. No human steps in, and payment comes from the Telegraph escrow:
   - `SMART_CONTRACT_AUDIT_GENERAL`: owner-drain, mint-to-self, fee, approval and proxy risks
   - `TOKEN_HOLDER_COUNT_GENERAL`: how many holders the contract has
   - `URL_SCAN_VERDICT`: whether the claim website is phishing (only when you pass `--url`)
4. **Decision:** `src/memo.js` combines everything. The worst signal wins. It **never says SAFE without paid intelligence.** If nothing could be bought, the most it can say is CAUTION.

How it differs from Season I's Truvian Shield (a pre-sign check for agents): Cek Aman Intel is for **claim hunters**, and it mixes in **community proof-of-claim reports** from Agent ID holders.

## Run it (beginner steps)

You need Node.js 20 or newer.

```bash
npm install
npm test                                   # 9 unit tests, no network needed
node bin/cek-aman-intel.js 0x1296da72914EA99a6Ac0D0c94Afba2D890dFA25b
node bin/cek-aman-intel.js <address> --url https://claim-site.example --json
node bin/cek-aman-intel.js <address> --no-paid   # free checks only
```

Each run saves the full evidence to `receipts/<time>-<address>.json`. That includes every Telegraph reply with its `fulfillment` and payment rows.

Exit codes: `0` means SAFE or CAUTION, `3` means BLOCK, `2` means bad input.

### Funding the Telegraph testnet wallet (one time)

```bash
npx -y @telegraphprotocol/telegraph-protocol-mcp setup     # makes a wallet in ~/.telegraph (key never leaves the machine)
# send a little Sepolia ETH to that address from any public Sepolia faucet
node scripts/mint-test-usdc.mjs 2                         # mints 2 Telegraph test USDC (anyone can)
npx -y @telegraphprotocol/telegraph-protocol-mcp fund 2   # moves it into escrow
```

## Network, costs and limits

- Telegraph node: `https://devnode.telegraphprotocol.com` (testnet). Escrow diamond: `0x72a70e949362670Bf8bceAd24eFC5b8f950aa08b` on Ethereum Sepolia. Test USDC: `0xcc194e1a843B658526D0D5C431f670028582Ae17`.
- The free checks read BNB Smart Chain mainnet. They only read and never sign anything. You can set your own RPC with `BSC_RPC_URL`.
- Cost: the node quoted **100,000 μUSDC ($0.10 test)** for the audit ask. Simple intents are usually about $0.01. A full memo costs roughly $0.10–$0.25 in test USDC.
- Spending limits are set by the app: at most $0.10 per ask and $1 per UTC day (`TELEGRAPH_MAX_ASK_USD`, `TELEGRAPH_DAILY_LIMIT_USD`).
- If an ask fails, it isn't billed. An empty escrow returns HTTP 402. The memo then says "free checks only" and caps the verdict at CAUTION.

## Troubleshooting

- `402 payment required … balance=0`: your escrow is empty. Run the funding steps above.
- `0 Sepolia ETH`: get gas from a Sepolia faucet first.
- BSC RPC timeouts: set `BSC_RPC_URL` to another public BSC RPC.

## Known limitations (honest)

- Audit answers are **judgment** intelligence from miners, not a professional audit.
- Holder counts can lag behind the chain.
- So far the Cek Aman community data comes from a small number of reporters.
- Only BSC is supported for now.

## License

MIT. See `LICENSE`.


## Evidence: first real paid ask (25 Nov 2026)
`receipts/sample-first-paid-ask-dune-keys.json` is the receipt of the first real machine-to-machine purchase (Telegraph testnet, Ethereum Sepolia, test USDC). Escrow deposit tx on Sepolia: `0xff9e7e1f0313298955ee15c3f8756e355c84afc66c680596f53e80bf5b947857`.
In that run no specialist miner answered the audit intent, so the node fell back to a general model, which invented code that is not in the verified contract. Since then Cek Aman Intel treats general-model fallback answers as low-confidence: they can raise CAUTION but never BLOCK on their own (covered by a unit test).
