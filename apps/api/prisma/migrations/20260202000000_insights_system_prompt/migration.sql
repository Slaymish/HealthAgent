-- Add per-user system prompt for insights generation
ALTER TABLE "users" ADD COLUMN "insights_system_prompt" TEXT;
