-- Track dead-letter style ingest failures so one bad payload does not block queue progress
ALTER TABLE "ingest_files"
  ADD COLUMN "failed_at" TIMESTAMP(3),
  ADD COLUMN "failure_reason" TEXT;

-- Persist administrative migration actions for explicit auditability
CREATE TABLE "admin_audit_logs" (
  "id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actor" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "target_user_id" TEXT,

  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs"("action", "created_at");
CREATE INDEX "admin_audit_logs_target_user_id_created_at_idx" ON "admin_audit_logs"("target_user_id", "created_at");

ALTER TABLE "admin_audit_logs"
  ADD CONSTRAINT "admin_audit_logs_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
