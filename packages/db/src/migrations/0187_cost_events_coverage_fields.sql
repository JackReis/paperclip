-- JAC-4529 (P0 of JAC-3929): add coverage-aware fail-closed fields to cost_events.
-- New columns: reasoning_tokens, tool_call_tokens, currency, pricing_version_ref,
-- coverage_state, source_status, safe_status, confidence, coverage_warning.
-- New index: cost_events_company_coverage_idx.

ALTER TABLE "cost_events" ADD COLUMN IF NOT EXISTS "reasoning_tokens" integer;--> statement-breakpoint
ALTER TABLE "cost_events" ADD COLUMN IF NOT EXISTS "tool_call_tokens" integer;--> statement-breakpoint
ALTER TABLE "cost_events" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "cost_events" ADD COLUMN IF NOT EXISTS "pricing_version_ref" text;--> statement-breakpoint

-- Coverage-aware fail-closed fields.
-- Defaults are fail-closed: absent/uncertain source reporting → "unknown"/"unavailable".
ALTER TABLE "cost_events" ADD COLUMN IF NOT EXISTS "coverage_state" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "cost_events" ADD COLUMN IF NOT EXISTS "source_status" text DEFAULT 'unavailable' NOT NULL;--> statement-breakpoint
ALTER TABLE "cost_events" ADD COLUMN IF NOT EXISTS "safe_status" text DEFAULT 'unavailable' NOT NULL;--> statement-breakpoint
ALTER TABLE "cost_events" ADD COLUMN IF NOT EXISTS "confidence" text DEFAULT 'low' NOT NULL;--> statement-breakpoint

-- Coverage warning: surfaced separately from spend totals so consumers can
-- distinguish "zero because no tokens used" from "zero because not reported".
ALTER TABLE "cost_events" ADD COLUMN IF NOT EXISTS "coverage_warning" text;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "cost_events_company_coverage_idx"
  ON "cost_events" USING btree ("company_id", "coverage_state", "occurred_at");--> statement-breakpoint
