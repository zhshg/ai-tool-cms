# Release Candidate Sprint 2 Batch 9 - Commercial Platform

## Summary

This batch prepares the commercial platform for production monetization using the existing schema and services. It does not add new Prisma migrations and does not invent unsupported revenue data.

## Supported Commercial Capabilities

| Capability | Current Support | Production Notes |
| --- | --- | --- |
| Affiliate | Supported | Affiliate programs, affiliate links, redirect tracking, clicks, conversions, and commission revenue are wired. |
| Sponsored Tools | Supported | Sponsored placements use `SponsoredPlacement` with type, status, weight, start/end windows, regions, and devices. |
| Featured Tools | Supported | Featured tools are represented by `SponsoredPlacementType.FEATURED`. |
| Advertising | Supported | Ad slots use `AdSlot` with network, position, sort order, status, config, and metadata. |
| Newsletter | Supported | Subscribers, campaign types, campaigns, scheduling, and queue handoff exist. Dashboard now exposes subscriber and campaign counts. |
| Partner Links | Supported through Affiliate | Partner links currently reuse affiliate links connected to active affiliate programs. |
| Coupons | Not implemented | No dedicated coupon model exists. Dashboard exposes 0 and documents the gap. |
| Revenue Dashboard | Supported | Revenue overview and monetization dashboard aggregate affiliate clicks, conversions, commissions, placements, ads, pricing plans, partners, and newsletter readiness. |

## Backend Implementation

The monetization dashboard now returns additional production readiness metrics:

- Active partner accounts
- Newsletter subscribers
- Confirmed newsletter subscribers
- Newsletter campaigns
- Scheduled newsletter campaigns
- Partner links
- Active partner links

Existing endpoint preserved:

- `GET /v1/monetization/dashboard`

No public API contract was removed. Existing fields remain backward compatible.

## Admin Implementation

The Admin Monetization page now displays:

- Affiliate Links
- Featured Tools
- Sponsored Tools
- Banner Ads
- Pricing Plans
- Coupons
- Partner Accounts
- Partner Links
- Newsletter
- Invoices
- Clicks
- Conversions
- Revenue
- Top Affiliate Links
- Revenue Mix
- Sponsored Placements
- Banner Ads
- Pricing Plans

The UI keeps unsupported items visible as zero with clear explanatory text instead of showing fake commercial data.

## Revenue Data Rules

- Affiliate clicks come from `AffiliateClick` in the last 30 days.
- Conversions come from `AffiliateConversion` in the last 30 days.
- Revenue comes from `AffiliateCommission` in the last 30 days and revenue snapshots.
- Sponsored and featured tools come from `SponsoredPlacement`.
- Banner ads come from `AdSlot`.
- Partner accounts come from `PartnerAccount`.
- Newsletter readiness comes from `NewsletterSubscriber` and `NewsletterCampaign`.
- Coupons and invoices remain unsupported until dedicated models exist.

## Production Readiness Notes

### Ready

- Affiliate redirect and click tracking.
- Sponsored and featured placement configuration.
- Ad slot configuration.
- Newsletter subscriber and campaign foundation.
- Partner account foundation.
- Revenue dashboard aggregation.

### Gaps

- Dedicated coupon model.
- Dedicated invoice/billing model.
- Partner-specific attribution beyond affiliate links.
- Ad impression tracking model.
- Newsletter open/click analytics.

## Files Changed

- `apps/api/src/commercial/monetization.service.ts`
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/app/(dashboard)/monetization/page.tsx`
- `docs/14-production/CommercialPlatform.md`

## Acceptance

- Affiliate metrics are visible.
- Sponsored tools and featured tools are visible.
- Advertising slots are visible.
- Newsletter readiness is visible.
- Partner links and partner account readiness are visible.
- Coupons are clearly marked unsupported rather than faked.
- Revenue dashboard continues to use real tracked data.
