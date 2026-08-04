-- JAC-4529 (child of JAC-3929): add run_events table for coverage-aware
-- fail-closed event fields. This captures EVERY run regardless of spend,
-- complementing cost_events (which only record spend line-items).
-- Token/cost fields are nullable: null = not_reported, 0 = explicitly zero.

CREATE TABLE IF NOT EXISTS "run_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "agent_id" uuid NOT NULL REFERENCES "agents"("id"),
  "issue_id" uuid REFERENCES "issues"("id"),
  "run_id" uuid NOT NULL REFERENCES "heartbeat_runs"("id"),
  "adapter_type" text NOT NULL,
  "model" text NOT NULL DEFAULT 'unknown',
  "provider" text NOT NULL DEFAULT 'unknown',
  "status" text NOT NULL DEFAULT 'success',
  "input_tokens" integer,
  "output_tokens" integer,
  "cached_input_tokens" integer,
  "reasoning_tokens" integer,
  "tool_call_tokens" integer,
  "cost_cents" integer,
  "currency" text NOT NULL DEFAULT 'USD',
  "usage_reported_state" text NOT NULL DEFAULT 'not_reported',
  "usage_source_field" text,
  "coverage_state" text NOT NULL DEFAULT 'unknown',
  "source_status" text NOT NULL DEFAULT 'unavailable',
  "safe_status" text NOT NULL DEFAULT 'unavailable',
  "confidence" text NOT NULL DEFAULT 'low',
  "observed_at" timestamptz NOT NULL DEFAULT now(),
  "ingest_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "payload_hash" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "run_events_company_run_idx"
  ON "run_events" USING btree ("company_id", "run_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "run_events_company_coverage_idx"
  ON "run_events" USING btree ("company_id", "coverage_state", "observed_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "run_events_company_safe_status_idx"
  ON "run_events" USING btree ("company_id", "safe_status", "observed_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "run_events_payload_hash_idx"
  ON "run_events" USING btree ("company_id", "payload_hash");--> statement-breakpoint
