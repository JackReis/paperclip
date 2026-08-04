#!/usr/bin/env node
// Standalone JWT forging for Fenix agent (no external deps, node:crypto only)
import { createHmac, timingSafeEqual } from "node:crypto";

const masterSecret = process.env.PAPERCLIP_AGENT_JWT_SECRET;
const instanceId = process.env.PAPERCLIP_INSTANCE_ID || "default";
const companyId = process.env.PAPERCLIP_COMPANY_ID;
const agentId = process.env.FENIX_AGENT_ID || "e7e5a7c6-0ae5-42e7-a644-e5992480335a";
const runId = process.env.PAPERCLIP_RUN_ID;

if (!masterSecret || !companyId || !runId) {
  console.error("Missing required env vars: PAPERCLIP_AGENT_JWT_SECRET, PAPERCLIP_COMPANY_ID, PAPERCLIP_RUN_ID");
  process.exit(1);
}

function deriveCompanySigningKey(master, company, instance) {
  return createHmac("sha256", master).update(`jwt:${instance}:${company}`).digest("hex");
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(secret, signingInput) {
  return createHmac("sha256", secret).update(signingInput).digest("base64url");
}

const now = Math.floor(Date.now() / 1000);
const ttlSeconds = 3600;
const claims = {
  sub: agentId,
  company_id: companyId,
  adapter_type: "hermes_local",
  run_id: runId,
  responsible_user_id: null,
  iat: now,
  exp: now + ttlSeconds,
  iss: "paperclip",
  aud: "paperclip-api",
  instance_id: instanceId,
};

const header = { alg: "HS256", typ: "JWT" };
const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
const signingKey = deriveCompanySigningKey(masterSecret, companyId, instanceId);
const signature = signPayload(signingKey, signingInput);

const token = `${signingInput}.${signature}`;
process.stdout.write(token);
