#!/usr/bin/env node
/**
 * Minimal pilot: calls kernel inference façade via @meimei/sdk (no dashboard imports).
 *
 * Env: MEIMEI_KERNEL_BASE_URL, MEIMEI_PILOT_APP_ID, optional MEIMEI_PILOT_APP_SECRET
 */
import { MeiMeiKernelClient } from "@meimei/sdk";

async function main() {
  const appId = String(process.env.MEIMEI_PILOT_APP_ID || "").trim();
  const baseUrl = String(process.env.MEIMEI_KERNEL_BASE_URL || "").trim();
  if (!appId || !baseUrl) {
    console.error("Set MEIMEI_KERNEL_BASE_URL and MEIMEI_PILOT_APP_ID (see docs/operations/kernel-apps.v1.md).");
    process.exit(1);
  }
  const secret = String(process.env.MEIMEI_PILOT_APP_SECRET || "").trim();
  const client = new MeiMeiKernelClient({
    baseUrl,
    appId,
    appSecret: secret || undefined
  });
  const out = await client.inference({
    model: "router-auto",
    messages: [{ role: "user", content: "ping" }],
    stream: false,
    meimei: { localOnly: true, taskCategory: "summarize" }
  });
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  process.exit(out.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
