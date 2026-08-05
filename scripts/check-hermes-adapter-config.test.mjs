import assert from "node:assert/strict";
import test from "node:test";
import {
  checkAdapterConfig,
  runCheck,
} from "./check-hermes-adapter-config.mjs";

test("checkAdapterConfig passes for valid explicit config", () => {
  const offenses = checkAdapterConfig(
    { model: "ollama-launch/qwen3-coder:30b", provider: "ollama-launch" },
    "agent-test",
  );
  assert.deepEqual(offenses, []);
});

test("checkAdapterConfig flags empty adapterConfig", () => {
  const offenses = checkAdapterConfig({}, "agent-empty");
  assert.ok(offenses.length > 0);
  assert.ok(offenses.some((o) => o.includes("empty") && o.includes("agent-empty")));
});

test("checkAdapterConfig flags model='auto'", () => {
  const offenses = checkAdapterConfig(
    { model: "auto", provider: "auto" },
    "agent-auto",
  );
  assert.ok(offenses.some((o) => o.includes("auto") && o.includes("agent-auto")));
});

test("checkAdapterConfig flags model='auto' even with explicit provider", () => {
  const offenses = checkAdapterConfig(
    { model: "auto", provider: "nous" },
    "agent-auto2",
  );
  assert.ok(offenses.some((o) => o.includes("auto") && o.includes("agent-auto2")));
});

test("checkAdapterConfig allows provider='auto' with explicit model", () => {
  const offenses = checkAdapterConfig(
    { model: "ollama-launch/qwen3-coder:30b", provider: "auto" },
    "agent-ok",
  );
  assert.deepEqual(offenses, []);
});

test("checkAdapterConfig flags non-object config", () => {
  const offenses = checkAdapterConfig(null, "agent-null");
  assert.ok(offenses.length > 0);
  assert.ok(offenses.some((o) => o.includes("agent-null")));
});

test("runCheck passes on hermes adapter directory (no anti-patterns)", () => {
  const logs = [];
  const errors = [];
  const code = runCheck({
    log: (msg) => logs.push(msg),
    error: (msg) => errors.push(msg),
  });
  // The repo's actual adapter code should be clean.
  assert.equal(code, 0);
});
