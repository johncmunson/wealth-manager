CREATE TABLE "alpaca_accounts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "alpaca_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1000 CACHE 1),
	"user_id" integer NOT NULL,
	"alpaca_account_id" text,
	"account_number" text,
	"provisioning_status" text DEFAULT 'pending' NOT NULL,
	"alpaca_status" text,
	"failure_reason" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alpaca_accounts_provisioning_status_check" CHECK ("alpaca_accounts"."provisioning_status" in ('pending', 'linked', 'failed', 'unknown'))
);
--> statement-breakpoint
DROP TABLE "profiles" CASCADE;--> statement-breakpoint
ALTER TABLE "alpaca_accounts" ADD CONSTRAINT "alpaca_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alpaca_accounts_user_id_unique" ON "alpaca_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "alpaca_accounts_alpaca_account_id_unique" ON "alpaca_accounts" USING btree ("alpaca_account_id");