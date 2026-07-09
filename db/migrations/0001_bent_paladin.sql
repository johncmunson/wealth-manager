DROP INDEX "users_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" USING btree (LOWER("email"));