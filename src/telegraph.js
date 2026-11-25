// SPDX-License-Identifier: MIT
// Thin client: starts the official Telegraph MCP server (stdio) and calls its tools.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

export async function connectTelegraph(env = {}) {
  const serverPath = require.resolve("@telegraphprotocol/telegraph-protocol-mcp/dist/index.js");
  const transport = new StdioClientTransport({
    command: process.execPath, args: [serverPath],
    env: { ...process.env, TELEGRAPH_MAX_ASK_USD: "0.10", TELEGRAPH_DAILY_LIMIT_USD: "1", ...env },
    stderr: "pipe",
  });
  const client = new Client({ name: "cek-aman-intel", version: "0.1.0" });
  await client.connect(transport);
  return {
    async call(name, args = {}) {
      const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 180000 });
      const text = (r.content || []).filter(c => c.type === "text").map(c => c.text).join("\n");
      let data; try { data = JSON.parse(text); } catch { data = text; }
      return { isError: !!r.isError, data, raw: text, structured: r.structuredContent };
    },
    close: () => client.close(),
  };
}
