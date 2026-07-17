CREATE TABLE IF NOT EXISTS "agent_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "agent_id" uuid NOT NULL,
  "agent_session_key" text NOT NULL,
  "title" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "started_at" timestamp with time zone,
  "ended_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "context_json" jsonb,
  "compaction_json" jsonb,
  "adapter_metadata_json" jsonb,
  "provider" text,
  "execution_workspace_id" uuid,
  "cwd" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "agent_id" uuid;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "agent_session_key" text;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "title" text DEFAULT '';
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "ended_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "last_used_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "context_json" jsonb;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "compaction_json" jsonb;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "adapter_metadata_json" jsonb;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "provider" text;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "execution_workspace_id" uuid;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "cwd" text;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "agent_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "agent_session_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "title" SET DEFAULT '';
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "title" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "status" SET DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "updated_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "agent_sessions" ALTER COLUMN "updated_at" SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_sessions_company_id_companies_id_fk'
      AND conrelid = 'public.agent_sessions'::regclass
  ) THEN
    ALTER TABLE "agent_sessions"
      ADD CONSTRAINT "agent_sessions_company_id_companies_id_fk"
      FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_sessions_agent_id_agents_id_fk'
      AND conrelid = 'public.agent_sessions'::regclass
  ) THEN
    ALTER TABLE "agent_sessions"
      ADD CONSTRAINT "agent_sessions_agent_id_agents_id_fk"
      FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_sessions_execution_workspace_id_execution_workspaces_id_fk'
      AND conrelid = 'public.agent_sessions'::regclass
  ) THEN
    ALTER TABLE "agent_sessions"
      ADD CONSTRAINT "agent_sessions_execution_workspace_id_execution_workspaces_id_fk"
      FOREIGN KEY ("execution_workspace_id") REFERENCES "public"."execution_workspaces"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "heartbeat_runs" ADD COLUMN IF NOT EXISTS "session_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'heartbeat_runs_session_id_agent_sessions_id_fk'
      AND conrelid = 'public.heartbeat_runs'::regclass
  ) THEN
    ALTER TABLE "heartbeat_runs"
      ADD CONSTRAINT "heartbeat_runs_session_id_agent_sessions_id_fk"
      FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "session_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'issues_session_id_agent_sessions_id_fk'
      AND conrelid = 'public.issues'::regclass
  ) THEN
    ALTER TABLE "issues"
      ADD CONSTRAINT "issues_session_id_agent_sessions_id_fk"
      FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_sessions_agent_session_key_unique"
  ON "agent_sessions" USING btree ("agent_session_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_sessions_company_agent_updated_idx"
  ON "agent_sessions" USING btree ("company_id", "agent_id", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_sessions_company_last_used_idx"
  ON "agent_sessions" USING btree ("company_id", "last_used_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_sessions_company_agent_issue_idx"
  ON "agent_sessions" USING btree ("company_id", "agent_id", "context_json");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_sessions_company_agent_status_idx"
  ON "agent_sessions" USING btree ("company_id", "agent_id", "status");
