-- Sprint 7: Commercial Platform (Commits 061-070)

-- CreateEnum
CREATE TYPE "AffiliateNetwork" AS ENUM ('AMAZON', 'IMPACT', 'PARTNERSTACK', 'CJ', 'SHAREASALE', 'CUSTOM');
CREATE TYPE "AffiliateProgramStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "AffiliateLinkStatus" AS ENUM ('ACTIVE', 'PAUSED');
CREATE TYPE "SponsoredPlacementType" AS ENUM ('SPONSORED', 'FEATURED', 'TRENDING', 'EDITORS_CHOICE');
CREATE TYPE "SponsoredPlacementStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'EXPIRED', 'PAUSED');
CREATE TYPE "AdNetwork" AS ENUM ('ADSENSE', 'AD_MANAGER', 'CARBON', 'CUSTOM', 'NATIVE');
CREATE TYPE "AdSlotStatus" AS ENUM ('ACTIVE', 'PAUSED');
CREATE TYPE "NewsletterCampaignType" AS ENUM ('WEEKLY_AI', 'TOP_AI', 'NEW_AI', 'TRENDING_AI', 'CATEGORY_WEEKLY');
CREATE TYPE "NewsletterCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');
CREATE TYPE "NewsletterSubscriberStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED');
CREATE TYPE "EmailTemplateType" AS ENUM ('NEW_TOOL', 'WEEKLY_DIGEST', 'MONTHLY_DIGEST', 'TRENDING', 'COLLECTIONS', 'NEWSLETTER', 'CONFIRM', 'CUSTOM');
CREATE TYPE "WebhookEvent" AS ENUM ('TOOL_ADDED', 'TOOL_UPDATED', 'AI_GENERATED', 'CRAWLER_FINISHED', 'SEO_UPDATED');
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING');
CREATE TYPE "RevenueSource" AS ENUM ('AFFILIATE', 'ADS', 'SPONSORED', 'API', 'OTHER');
CREATE TYPE "PartnerAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "api_key_usage_logs" (
    "id" UUID NOT NULL,
    "api_key_id" UUID NOT NULL,
    "endpoint" VARCHAR(256) NOT NULL,
    "method" VARCHAR(16) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_key_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_programs" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "network" "AffiliateNetwork" NOT NULL,
    "status" "AffiliateProgramStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "affiliate_programs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_links" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "program_id" UUID,
    "network" "AffiliateNetwork" NOT NULL DEFAULT 'CUSTOM',
    "official_url" VARCHAR(2048) NOT NULL,
    "affiliate_url" VARCHAR(2048) NOT NULL,
    "status" "AffiliateLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_clicks" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "referrer" VARCHAR(2048),
    "country" VARCHAR(8),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_conversions" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'USD',
    "external_id" VARCHAR(128),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "affiliate_conversions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_commissions" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "affiliate_campaigns" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "utm_source" VARCHAR(64),
    "utm_medium" VARCHAR(64),
    "utm_campaign" VARCHAR(128),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "affiliate_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sponsored_placements" (
    "id" UUID NOT NULL,
    "tool_id" UUID NOT NULL,
    "type" "SponsoredPlacementType" NOT NULL,
    "status" "SponsoredPlacementStatus" NOT NULL DEFAULT 'SCHEDULED',
    "weight" INTEGER NOT NULL DEFAULT 100,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "devices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "sponsored_placements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ad_slots" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "network" "AdNetwork" NOT NULL DEFAULT 'CUSTOM',
    "position" VARCHAR(64) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "AdSlotStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "ad_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "newsletter_subscribers" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "status" "NewsletterSubscriberStatus" NOT NULL DEFAULT 'PENDING',
    "locale" VARCHAR(16) NOT NULL DEFAULT 'zh-CN',
    "confirm_token" VARCHAR(128),
    "confirmed_at" TIMESTAMP(3),
    "unsubscribed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "newsletter_campaigns" (
    "id" UUID NOT NULL,
    "type" "NewsletterCampaignType" NOT NULL,
    "status" "NewsletterCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" VARCHAR(320) NOT NULL,
    "content_html" TEXT,
    "category_id" UUID,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "newsletter_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "EmailTemplateType" NOT NULL,
    "subject" VARCHAR(320) NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_send_logs" (
    "id" UUID NOT NULL,
    "template_id" UUID,
    "to_email" VARCHAR(320) NOT NULL,
    "subject" VARCHAR(320) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'sent',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_send_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhooks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "secret" VARCHAR(128) NOT NULL,
    "events" "WebhookEvent"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "webhook_id" UUID NOT NULL,
    "event" "WebhookEvent" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "status_code" INTEGER,
    "response_body" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company" VARCHAR(200) NOT NULL,
    "status" "PartnerAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "partner_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "revenue_snapshots" (
    "id" UUID NOT NULL,
    "source" "RevenueSource" NOT NULL,
    "period" VARCHAR(16) NOT NULL,
    "period_key" VARCHAR(32) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'USD',
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "revenue_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_key_usage_logs_api_key_id_idx" ON "api_key_usage_logs"("api_key_id");
CREATE INDEX "api_key_usage_logs_endpoint_idx" ON "api_key_usage_logs"("endpoint");
CREATE INDEX "api_key_usage_logs_created_at_idx" ON "api_key_usage_logs"("created_at");

CREATE INDEX "affiliate_programs_slug_idx" ON "affiliate_programs"("slug");
CREATE INDEX "affiliate_programs_network_idx" ON "affiliate_programs"("network");
CREATE INDEX "affiliate_programs_status_idx" ON "affiliate_programs"("status");
CREATE INDEX "affiliate_programs_deleted_at_idx" ON "affiliate_programs"("deleted_at");
CREATE INDEX "affiliate_programs_updated_at_idx" ON "affiliate_programs"("updated_at");

CREATE INDEX "affiliate_links_tool_id_idx" ON "affiliate_links"("tool_id");
CREATE INDEX "affiliate_links_program_id_idx" ON "affiliate_links"("program_id");
CREATE INDEX "affiliate_links_network_idx" ON "affiliate_links"("network");
CREATE INDEX "affiliate_links_status_idx" ON "affiliate_links"("status");
CREATE INDEX "affiliate_links_deleted_at_idx" ON "affiliate_links"("deleted_at");
CREATE INDEX "affiliate_links_updated_at_idx" ON "affiliate_links"("updated_at");

CREATE INDEX "affiliate_clicks_link_id_idx" ON "affiliate_clicks"("link_id");
CREATE INDEX "affiliate_clicks_created_at_idx" ON "affiliate_clicks"("created_at");

CREATE INDEX "affiliate_conversions_link_id_idx" ON "affiliate_conversions"("link_id");
CREATE INDEX "affiliate_conversions_created_at_idx" ON "affiliate_conversions"("created_at");

CREATE INDEX "affiliate_commissions_link_id_idx" ON "affiliate_commissions"("link_id");
CREATE INDEX "affiliate_commissions_status_idx" ON "affiliate_commissions"("status");
CREATE INDEX "affiliate_commissions_created_at_idx" ON "affiliate_commissions"("created_at");

CREATE INDEX "affiliate_campaigns_program_id_idx" ON "affiliate_campaigns"("program_id");
CREATE INDEX "affiliate_campaigns_deleted_at_idx" ON "affiliate_campaigns"("deleted_at");

CREATE INDEX "sponsored_placements_tool_id_idx" ON "sponsored_placements"("tool_id");
CREATE INDEX "sponsored_placements_type_idx" ON "sponsored_placements"("type");
CREATE INDEX "sponsored_placements_status_idx" ON "sponsored_placements"("status");
CREATE INDEX "sponsored_placements_start_at_idx" ON "sponsored_placements"("start_at");
CREATE INDEX "sponsored_placements_end_at_idx" ON "sponsored_placements"("end_at");
CREATE INDEX "sponsored_placements_deleted_at_idx" ON "sponsored_placements"("deleted_at");

CREATE INDEX "ad_slots_slug_idx" ON "ad_slots"("slug");
CREATE INDEX "ad_slots_position_idx" ON "ad_slots"("position");
CREATE INDEX "ad_slots_status_idx" ON "ad_slots"("status");
CREATE INDEX "ad_slots_sort_order_idx" ON "ad_slots"("sort_order");
CREATE INDEX "ad_slots_deleted_at_idx" ON "ad_slots"("deleted_at");

CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");
CREATE INDEX "newsletter_subscribers_status_idx" ON "newsletter_subscribers"("status");
CREATE INDEX "newsletter_subscribers_deleted_at_idx" ON "newsletter_subscribers"("deleted_at");

CREATE INDEX "newsletter_campaigns_type_idx" ON "newsletter_campaigns"("type");
CREATE INDEX "newsletter_campaigns_status_idx" ON "newsletter_campaigns"("status");
CREATE INDEX "newsletter_campaigns_scheduled_at_idx" ON "newsletter_campaigns"("scheduled_at");
CREATE INDEX "newsletter_campaigns_deleted_at_idx" ON "newsletter_campaigns"("deleted_at");

CREATE INDEX "email_templates_slug_idx" ON "email_templates"("slug");
CREATE INDEX "email_templates_type_idx" ON "email_templates"("type");
CREATE INDEX "email_templates_deleted_at_idx" ON "email_templates"("deleted_at");

CREATE INDEX "email_send_logs_template_id_idx" ON "email_send_logs"("template_id");
CREATE INDEX "email_send_logs_to_email_idx" ON "email_send_logs"("to_email");
CREATE INDEX "email_send_logs_status_idx" ON "email_send_logs"("status");
CREATE INDEX "email_send_logs_created_at_idx" ON "email_send_logs"("created_at");

CREATE INDEX "webhooks_user_id_idx" ON "webhooks"("user_id");
CREATE INDEX "webhooks_is_active_idx" ON "webhooks"("is_active");
CREATE INDEX "webhooks_deleted_at_idx" ON "webhooks"("deleted_at");

CREATE INDEX "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries"("webhook_id");
CREATE INDEX "webhook_deliveries_event_idx" ON "webhook_deliveries"("event");
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries"("status");
CREATE INDEX "webhook_deliveries_created_at_idx" ON "webhook_deliveries"("created_at");

CREATE UNIQUE INDEX "partner_accounts_user_id_key" ON "partner_accounts"("user_id");
CREATE INDEX "partner_accounts_status_idx" ON "partner_accounts"("status");
CREATE INDEX "partner_accounts_deleted_at_idx" ON "partner_accounts"("deleted_at");

CREATE UNIQUE INDEX "revenue_snapshots_source_period_key_key" ON "revenue_snapshots"("source", "period_key");
CREATE INDEX "revenue_snapshots_source_idx" ON "revenue_snapshots"("source");
CREATE INDEX "revenue_snapshots_period_idx" ON "revenue_snapshots"("period");
CREATE INDEX "revenue_snapshots_period_key_idx" ON "revenue_snapshots"("period_key");
CREATE INDEX "revenue_snapshots_created_at_idx" ON "revenue_snapshots"("created_at");

-- Partial unique indexes
CREATE UNIQUE INDEX "affiliate_programs_slug_active_key" ON "affiliate_programs"("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "ad_slots_slug_active_key" ON "ad_slots"("slug") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "email_templates_slug_active_key" ON "email_templates"("slug") WHERE "deleted_at" IS NULL;

-- AddForeignKey
ALTER TABLE "api_key_usage_logs" ADD CONSTRAINT "api_key_usage_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "affiliate_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_campaigns" ADD CONSTRAINT "affiliate_campaigns_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "affiliate_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsored_placements" ADD CONSTRAINT "sponsored_placements_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_accounts" ADD CONSTRAINT "partner_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
