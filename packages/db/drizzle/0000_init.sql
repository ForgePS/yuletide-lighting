CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'office', 'crew');
CREATE TYPE "public"."job_stage" AS ENUM('draft_proposal', 'sent_proposal', 'accepted_proposal', 'lost', 'invoiced', 'deposit_paid', 'inventory_reserved', 'scheduled', 'installed', 'removal_scheduled', 'removed', 'review_requested', 'complete');
CREATE TYPE "public"."proposal_status" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired');
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'partial', 'paid', 'overdue', 'void');
CREATE TYPE "public"."message_channel" AS ENUM('sms', 'email', 'portal');
CREATE TYPE "public"."agreement_mode" AS ENUM('single', 'multi');
CREATE TYPE "public"."job_material_status" AS ENUM('planned', 'reserved', 'consumed', 'released');
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded');
CREATE TYPE "public"."automation_trigger" AS ENUM('proposal_viewed_no_accept', 'invoice_overdue', 'job_complete', 'removal_complete');

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_org_id" text NOT NULL UNIQUE,
  "company_name" text NOT NULL,
  "brand_color" text DEFAULT '#DC2626' NOT NULL,
  "logo_url" text,
  "agreement_mode" "agreement_mode" DEFAULT 'multi' NOT NULL,
  "agreement_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "stripe_connect_account_id" text,
  "twilio_phone_number" text,
  "review_google_url" text,
  "review_facebook_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "clerk_user_id" text NOT NULL,
  "email" text NOT NULL,
  "first_name" text,
  "last_name" text,
  "role" "user_role" DEFAULT 'office' NOT NULL,
  "push_token" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_org_clerk_idx" ON "users" ("organization_id", "clerk_user_id");
CREATE INDEX IF NOT EXISTS "users_org_idx" ON "users" ("organization_id");

CREATE TABLE IF NOT EXISTS "customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "email" text,
  "phone" text,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "notes" text,
  "sms_opt_in" boolean DEFAULT true NOT NULL,
  "email_opt_in" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "customers_org_idx" ON "customers" ("organization_id");

CREATE TABLE IF NOT EXISTS "properties" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "label" text DEFAULT 'Primary' NOT NULL,
  "address_line1" text NOT NULL,
  "address_line2" text,
  "city" text NOT NULL,
  "state" text NOT NULL,
  "postal_code" text NOT NULL,
  "country" text DEFAULT 'US' NOT NULL,
  "latitude" real,
  "longitude" real,
  "install_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "inventory_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "sku" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category" text,
  "unit" text DEFAULT 'each' NOT NULL,
  "quantity_on_hand" real DEFAULT 0 NOT NULL,
  "quantity_reserved" real DEFAULT 0 NOT NULL,
  "reorder_threshold" real DEFAULT 0 NOT NULL,
  "prices" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_org_sku_idx" ON "inventory_items" ("organization_id", "sku");

CREATE TABLE IF NOT EXISTS "proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "status" "proposal_status" DEFAULT 'draft' NOT NULL,
  "agreement_mode" "agreement_mode" DEFAULT 'single' NOT NULL,
  "agreement_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "selected_agreement_code" text,
  "line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "subtotal_cents" integer DEFAULT 0 NOT NULL,
  "notes" text,
  "valid_until" timestamp with time zone,
  "public_token" text NOT NULL UNIQUE,
  "view_count" integer DEFAULT 0 NOT NULL,
  "last_viewed_at" timestamp with time zone,
  "accepted_at" timestamp with time zone,
  "accepted_by_name" text,
  "mockup_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE cascade,
  "proposal_id" uuid REFERENCES "proposals"("id") ON DELETE set null,
  "title" text NOT NULL,
  "stage" "job_stage" DEFAULT 'draft_proposal' NOT NULL,
  "assigned_crew_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "scheduled_start" timestamp with time zone,
  "scheduled_end" timestamp with time zone,
  "installed_at" timestamp with time zone,
  "removed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "job_materials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id") ON DELETE cascade,
  "inventory_item_id" uuid NOT NULL REFERENCES "inventory_items"("id") ON DELETE restrict,
  "quantity" real NOT NULL,
  "status" "job_material_status" DEFAULT 'planned' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "proposal_id" uuid REFERENCES "proposals"("id") ON DELETE set null,
  "job_id" uuid REFERENCES "jobs"("id") ON DELETE set null,
  "invoice_number" text NOT NULL,
  "status" "invoice_status" DEFAULT 'draft' NOT NULL,
  "subtotal_cents" integer DEFAULT 0 NOT NULL,
  "deposit_percent" integer DEFAULT 50 NOT NULL,
  "deposit_cents" integer DEFAULT 0 NOT NULL,
  "amount_paid_cents" integer DEFAULT 0 NOT NULL,
  "due_date" timestamp with time zone,
  "public_token" text NOT NULL UNIQUE,
  "stripe_payment_intent_id" text,
  "sent_at" timestamp with time zone,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_org_number_idx" ON "invoices" ("organization_id", "invoice_number");

CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE cascade,
  "amount_cents" integer NOT NULL,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "stripe_payment_intent_id" text,
  "stripe_charge_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "message_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "last_message_at" timestamp with time zone,
  "unread_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "threads_org_customer_idx" ON "message_threads" ("organization_id", "customer_id");

CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "thread_id" uuid NOT NULL REFERENCES "message_threads"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "channel" "message_channel" NOT NULL,
  "direction" text DEFAULT 'outbound' NOT NULL,
  "subject" text,
  "body" text NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "external_id" text,
  "sent_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "message_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "channel" "message_channel" NOT NULL,
  "subject" text,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "automations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "trigger" "automation_trigger" NOT NULL,
  "delay_hours" integer DEFAULT 48 NOT NULL,
  "template_id" uuid REFERENCES "message_templates"("id") ON DELETE set null,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "schedule_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id") ON DELETE cascade,
  "crew_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "routes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "crew_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "route_date" timestamp with time zone NOT NULL,
  "stops" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "total_distance_meters" real,
  "total_duration_seconds" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "mockups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "image_url" text NOT NULL,
  "rendered_image_url" text,
  "data" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "clock_in" timestamp with time zone NOT NULL,
  "clock_out" timestamp with time zone,
  "latitude" real,
  "longitude" real,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "review_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id") ON DELETE cascade,
  "platform" text NOT NULL,
  "review_url" text NOT NULL,
  "sent_at" timestamp with time zone,
  "clicked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "job_photos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "job_id" uuid NOT NULL REFERENCES "jobs"("id") ON DELETE cascade,
  "uploaded_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "url" text NOT NULL,
  "caption" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
