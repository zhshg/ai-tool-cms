# AI Tool CMS v2 Product Roadmap

## Vision

AI Tool CMS v2 should evolve from an AI tool directory and CMS into an AI discovery, workflow, ecosystem, and marketplace platform.

The v1 foundation proves the core catalog loop:

- collect AI tools
- classify them into categories and tags
- enrich pages with SEO content
- manage tools through Admin
- expose search, collections, analytics, import, review, monetization, and launch operations

The v2 product direction is broader: help users discover the right AI capability, help operators keep the catalog fresh, and help partners extend the platform through APIs, plugins, workflows, prompts, and marketplace surfaces.

## Current Product Baseline

### Existing Foundation

The current platform already has meaningful foundations for v2:

- Tools, categories, tags, pricing, FAQ, screenshots, reviews, collections, and SEO metadata
- Admin operations for tools, categories, import, AI review, analytics, collections, SEO, crawler, settings, and monetization
- Public pages for homepage, categories, tool detail, collections, blog, search, tags, comparison, and SEO landing pages
- AI content generation workflow using generation tasks, content revisions, queue stages, preview, approve, and reject
- Workflow primitives through `WorkflowDefinition` and `WorkflowRun`
- Plugin primitives through `PluginRegistration` and feature flags
- Public API primitives through API keys, usage logs, and public API modules
- Community primitives through reviews, review votes, favorites, and collections
- Prompt primitives through `Prompt` and `PromptCategory`
- Commercial primitives for affiliate links, sponsored placements, ads, newsletter, and revenue tracking

### Product Gap

The platform is not yet a complete v2 ecosystem because several capabilities are still operationally thin:

- AI Agent is not yet a first-class product experience
- Workflow Builder exists as backend primitives but lacks a visual builder and reusable action library
- Browser Extension / Chrome Plugin does not exist yet
- API Marketplace needs product packaging, quotas, billing, developer portal, and partner onboarding
- Plugin Marketplace needs sandboxing, review, install flow, compatibility rules, and governance
- Community needs identity, trust, moderation, and contribution incentives
- Prompt Library needs public discovery, editor workflow, versioning, attribution, and tool linkage
- Model Directory needs its own information architecture, data model, provider taxonomy, benchmarks, and pricing strategy

## Product Pillars

### 1. AI Operations Layer

Purpose: make the directory easier to operate at scale.

Capabilities:

- AI Agent for content operators
- AI-assisted tool classification
- AI-generated summaries, features, FAQs, SEO metadata, and quality checks
- Content completeness score
- Duplicate detection and merge suggestions
- Broken link, logo, screenshot, and pricing refresh suggestions
- Editorial review workflows with human approval

Success means the team can manage thousands of tools without turning Admin into manual spreadsheet labor.

### 2. Discovery Layer

Purpose: help users find the right AI tool, prompt, model, or workflow faster.

Capabilities:

- Advanced search and filters
- Curated collections
- Tool alternatives and comparisons
- Prompt Library
- Model Directory
- Personalized saved tools and collections
- Browser Extension / Chrome Plugin for discovery outside the website

Success means users come back because the product answers intent, not just keywords.

### 3. Workflow Layer

Purpose: turn discovery into action.

Capabilities:

- Visual Workflow Builder
- Scheduled crawler and refresh workflows
- AI content generation pipelines
- Integration actions for search indexing, newsletter, webhooks, and external APIs
- Workflow templates for common directory operations

Success means operators and power users can automate repeatable work without engineering every task.

### 4. Ecosystem Layer

Purpose: let developers, partners, and operators extend the platform.

Capabilities:

- API Marketplace
- Plugin Marketplace
- Developer portal
- API keys, usage, quotas, billing, and webhooks
- Partner integrations for analytics, search, storage, email, AI providers, and affiliate networks

Success means AI Tool CMS becomes a platform, not only a website.

### 5. Trust and Community Layer

Purpose: create user-generated quality signals without sacrificing editorial trust.

Capabilities:

- Reviews and votes
- Public profiles
- Community collections
- Moderation queue
- Trust signals and verified badges
- Abuse reporting
- Editorial overlays on community content

Success means community activity improves ranking, relevance, and trust while staying moderated.

## v2 Capability Map

| Capability | Current Basis | v2 Target | Schema/API Impact |
| --- | --- | --- | --- |
| AI Agent | AI generation tasks, content revisions, queues | Operator-facing assistant for audit, enrichment, classification, and recommendations | Likely needs conversation/session model and agent action logs |
| Browser Extension / Chrome Plugin | Public pages, import framework, API keys | Save tools, submit tools, capture metadata, monitor competitors | Needs extension app, token flow, submission API hardening |
| Workflow Builder | `WorkflowDefinition`, `WorkflowRun`, scheduler, queue | Visual workflow editor, reusable triggers/actions, run history | Existing models may work for MVP; likely needs action registry and permissions |
| API Marketplace | API keys, usage logs, public API, monetization | Developer portal, plans, quotas, billing, API docs, usage dashboard | Needs plan/quota/rate-limit product model |
| Plugin Marketplace | `PluginRegistration`, feature flags | Installable plugins, review process, compatibility, marketplace UI | Needs marketplace listing, version, install, permission, and sandbox strategy |
| Community | Reviews, votes, favorites, collections | Profiles, public activity, community collections, moderation | Needs profile and moderation expansion |
| Reviews | `Review`, `ReviewVote` | Verified reviews, abuse reporting, review summaries, ranking signals | Existing model supports MVP; moderation/reporting likely needs expansion |
| Prompt Library | `Prompt`, `PromptCategory` | Public prompt discovery, tool-linked prompts, prompt SEO pages, versioning | Existing model supports MVP; versioning/attribution may need expansion |
| Model Directory | None as first-class domain | Model pages, providers, capabilities, pricing, benchmarks, comparisons | New IA and likely new schema required |

## Milestones

## v2.0 Foundation

Goal: stabilize the production directory and make the current product reliable enough to build v2 on top.

Core capabilities:

- Production content quality standards
- Stable Admin operations
- Import and seed pipeline readiness
- SEO launch readiness
- Analytics dashboard reliability
- Search and category landing polish
- Launch, rollback, and incident response documentation

Dependencies:

- Clean production database setup
- Reliable seed/import workflow
- Search index bootstrap
- Admin auth and RBAC stability
- Public page performance and SEO validation

Acceptance criteria:

- Production verification report reaches Go or Conditional Go
- Core public pages return healthy responses
- Admin can operate tools, categories, collections, import, SEO, and analytics
- No launch blocker remains unresolved

## v2.1 AI Operations

Goal: make AI-assisted operations a first-class Admin capability.

Core capabilities:

- AI Agent panel in Admin
- Single-tool and bulk content improvement suggestions
- Category and tag mapping suggestions
- SEO title and description audit
- Content completeness scoring
- Duplicate tool detection
- Review queue with diff, approve, reject, and edit flows
- Agent action history and audit trail

Dependencies:

- Stable AI generation pipeline
- Clear content quality rubric
- Human review workflow
- Provider configuration and cost controls

Acceptance criteria:

- Operators can ask the AI Agent to audit a tool and generate actionable recommendations
- Bulk generation does not publish without human approval
- Every AI-generated change has review history
- Content score is visible in Admin and can be recalculated

## v2.2 Workflow Platform

Goal: turn internal automation into a reusable workflow platform.

Core capabilities:

- Visual Workflow Builder
- Workflow triggers: scheduled, manual, import completed, tool updated, crawler completed
- Workflow actions: generate content, refresh logo, capture screenshot, update search index, send webhook, create review task
- Workflow run history and retry
- Workflow templates for common CMS operations
- Permission-gated workflow management

Dependencies:

- Stable queue and scheduler
- Workflow action registry
- Admin UX for visual editing
- Safe execution and error handling

Acceptance criteria:

- Admin can create and run a workflow without editing JSON manually
- Failed steps are visible and retryable
- Workflow executions are auditable
- Existing crawler and AI refresh flows can be represented as workflow templates

## v2.3 Ecosystem Marketplace

Goal: open the platform to developers and partners.

Core capabilities:

- Developer portal
- API Marketplace landing page
- API plans, quotas, usage charts, and key management
- Plugin Marketplace listing pages
- Plugin install, enable, disable, and configuration flow
- Partner integration catalog
- Webhook subscriptions and delivery logs

Dependencies:

- API authentication and usage metering
- Monetization and billing strategy
- Plugin security model
- Documentation and examples

Acceptance criteria:

- Developers can create API keys, view usage, and understand available endpoints
- Operators can install or disable a plugin safely
- Marketplace pages explain capabilities, pricing, and integration requirements
- Plugin permissions are explicit before activation

## v2.4 Community Layer

Goal: add trusted community participation without weakening editorial quality.

Core capabilities:

- Public user profiles
- Community-submitted tools
- Community collections
- Reviews, votes, and verified usage signals
- Moderation queue for submissions and reviews
- Abuse reporting
- Trust badges for verified tools, partners, reviewers, and editors

Dependencies:

- User identity and profile model
- Moderation policy
- Anti-spam and abuse controls
- Editorial override rules

Acceptance criteria:

- Users can submit reviews and collections for moderation
- Admin can approve, reject, or edit community submissions
- Public pages distinguish editorial, sponsored, partner, and community signals
- Abuse reports create actionable moderation tasks

## v2.5 Discovery Expansion

Goal: expand beyond tools into prompts, models, and browser-assisted discovery.

Core capabilities:

- Public Prompt Library
- Tool-linked prompt pages
- Prompt categories, tags, examples, and SEO pages
- Model Directory with provider, capability, pricing, benchmark, and API information
- Model comparison pages
- Browser Extension / Chrome Plugin for saving tools, submitting tools, and capturing metadata
- Extension-based competitor monitoring and quick import

Dependencies:

- Prompt publishing workflow
- Model taxonomy and schema design
- Extension authentication and API security
- Browser store compliance review

Acceptance criteria:

- Users can browse prompts and models as first-class directory entities
- Tool detail pages can link to related prompts and models
- Extension can save or submit a tool without bypassing review
- Model pages have canonical metadata, structured data, and comparison support

## Quarter Plan

## Q1: Launch Hardening and Content Scale

Theme: make the current product operationally dependable.

Deliverables:

- Complete production verification and launch checklist
- Harden Admin content operations
- Improve content quality scoring and editorial reports
- Expand production dataset from starter content to scalable import pipeline
- Validate SEO, sitemap, search, and analytics
- Stabilize Docker, health checks, backups, monitoring, and rollback plans

Primary metrics:

- Production Score >= 85
- Release Score >= 85
- Content average score >= 80
- Search zero-result rate baseline established
- Admin critical path success rate >= 95 percent in manual QA

## Q2: AI Agent and Workflow Builder MVP

Theme: reduce manual operations and create automation leverage.

Deliverables:

- AI Agent MVP in Admin
- Content audit and improvement recommendations
- Bulk AI generation with approval workflow
- Visual Workflow Builder MVP
- Workflow templates for logo refresh, content refresh, SEO audit, search indexing, and import review
- Workflow run history and retry UI

Primary metrics:

- 50 percent reduction in manual content QA time
- 80 percent of AI changes reviewed through structured queue
- 5 reusable workflow templates active
- Failed workflow retry success rate tracked

## Q3: Browser Extension, Prompt Library, and Community Reviews

Theme: expand acquisition and user contribution loops.

Deliverables:

- Browser Extension / Chrome Plugin MVP
- Save tool and submit tool flows
- Prompt Library public pages and Admin workflow
- Community review submission and moderation
- Community collections MVP
- Trust and abuse reporting basics

Primary metrics:

- Extension weekly active users baseline established
- 20 percent of new tool submissions sourced from extension or community
- Review approval SLA defined and tracked
- Prompt pages indexed and included in sitemap

## Q4: Marketplace and Model Directory

Theme: turn the directory into an ecosystem platform.

Deliverables:

- API Marketplace MVP
- Developer portal and usage dashboard
- Plugin Marketplace MVP
- Partner integration catalog
- Model Directory MVP
- Model comparison pages
- Commercial packaging for API, plugins, sponsored placements, and partners

Primary metrics:

- First API plan launched
- First external plugin or partner integration listed
- Model Directory reaches initial editorial coverage target
- Revenue dashboard tracks affiliate, sponsored, ads, and API channels separately

## Key User Personas

### Directory Visitor

Needs:

- Find reliable AI tools quickly
- Compare alternatives
- Understand pricing, features, use cases, and trust signals

v2 value:

- Better recommendations
- Prompt and model discovery
- Community reviews
- Browser extension for saving tools

### Content Operator

Needs:

- Import, enrich, review, publish, and maintain many tools
- Avoid duplicate or low-quality content
- Keep SEO and links healthy

v2 value:

- AI Agent
- Workflow Builder
- Content scoring
- Automated refresh and review queues

### Developer / Partner

Needs:

- Access catalog data through APIs
- Integrate with AI Tool CMS
- Publish plugins or integrations
- Track usage and commercial performance

v2 value:

- API Marketplace
- Plugin Marketplace
- Developer portal
- Webhooks and usage analytics

### Community Contributor

Needs:

- Submit tools, reviews, prompts, and collections
- Build reputation
- See contributions published fairly

v2 value:

- Profiles
- Moderation transparency
- Trust badges
- Community collections

### AI Power User

Needs:

- Discover tools, prompts, models, and workflows together
- Save repeatable workflows
- Track what works across tasks

v2 value:

- Prompt Library
- Model Directory
- Workflow templates
- Browser extension

## Success Metrics

### Product Metrics

- Tool page conversion rate
- Search success rate
- Zero-result rate
- Collection page engagement
- Prompt page engagement
- Model comparison engagement
- Extension active users
- Review submission and approval rates

### Operations Metrics

- Content completeness score
- AI-generated suggestion approval rate
- Time from import to publish
- Broken link rate
- Logo and screenshot coverage
- Workflow success rate
- Queue backlog and retry rate

### Ecosystem Metrics

- Active API keys
- API requests by endpoint
- Developer signups
- Plugin installs
- Partner integrations
- Webhook delivery success rate
- API marketplace revenue

### Trust Metrics

- Review approval SLA
- Abuse report volume
- Moderation backlog
- Verified review ratio
- Duplicate submission rate
- Sponsored disclosure compliance

### Commercial Metrics

- Affiliate clicks
- Sponsored impressions and CTR
- Ad slot fill rate
- Newsletter subscribers and CTR
- API revenue
- Partner conversion rate

## Risks and Dependencies

### Content Quality Risk

Risk: AI-generated or imported content can become generic, inaccurate, duplicated, or over-optimized.

Mitigation:

- Keep human approval for publish-impacting changes
- Maintain content quality score and audit reports
- Track duplicate descriptions and unsupported claims
- Require source and confidence metadata for automated enrichment

### Plugin Security Risk

Risk: plugins can introduce unsafe code, data leakage, performance regressions, or permission abuse.

Mitigation:

- Define plugin permissions before marketplace launch
- Add plugin review and compatibility checks
- Separate plugin configuration from secrets
- Require audit logs for plugin actions

### API Monetization Risk

Risk: API usage can grow without clear quota, billing, or abuse controls.

Mitigation:

- Add plan, quota, and rate-limit strategy before public API marketplace launch
- Track per-key usage, errors, latency, and revenue
- Provide clear developer terms and acceptable use policy

### Community Moderation Risk

Risk: reviews, submissions, and collections can introduce spam, fake claims, or low-quality content.

Mitigation:

- Moderation queue before public publishing
- Abuse reporting
- Trust scores and verified badges
- Clear separation between editorial, sponsored, partner, and community content

### Browser Extension Compliance Risk

Risk: extension stores require privacy, permission, data collection, and security compliance.

Mitigation:

- Minimize permissions
- Avoid collecting unnecessary browsing history
- Provide privacy policy and data deletion flow
- Route submissions through review, not direct publish

### Model Directory Complexity Risk

Risk: model data changes quickly and can require new schemas, benchmarks, and provider integrations.

Mitigation:

- Start with editorial model profiles
- Define provider taxonomy first
- Add benchmark and pricing fields only after data governance is clear
- Avoid unsupported performance claims

## Implementation Sequencing

1. Finish v2.0 launch hardening before starting new surface area.
2. Build AI Agent on top of existing AI generation, content revision, and review queues.
3. Convert workflow JSON primitives into Admin Workflow Builder MVP.
4. Use workflow templates to power recurring operations such as content refresh, logo refresh, SEO audit, and indexing.
5. Launch Prompt Library before Model Directory because existing schema already supports prompts.
6. Launch Browser Extension after submission and moderation APIs are hardened.
7. Launch API Marketplace before Plugin Marketplace because API metering and developer portal are simpler than plugin sandboxing.
8. Launch Plugin Marketplace only after plugin permissions, review, compatibility, and rollback rules exist.
9. Launch Community features in stages: reviews, moderation, profiles, community collections.
10. Launch Model Directory after taxonomy, provider model, and SEO strategy are approved.

## Not-in-v2 / Deferred Scope

The following should not be included in the first v2 delivery unless explicitly reprioritized:

- Fully autonomous publishing without human review
- Open plugin execution without sandboxing or permission review
- Public model benchmarks without verifiable methodology
- Paid API marketplace without quota, billing, and abuse controls
- Browser extension permissions beyond what is required for save, submit, and capture workflows
- Community content auto-publish for untrusted users
- Real-time collaborative editing
- Enterprise SSO and advanced organization management
- Multi-tenant white-label marketplace
- Native mobile apps

## Roadmap Decision Summary

The recommended v2 path is:

1. Stabilize the production directory.
2. Use AI Agent and Workflow Builder to make operations scalable.
3. Add contribution loops through extension, prompts, reviews, and community.
4. Expand into API, plugin, and model marketplaces once governance and monetization are ready.

This sequence keeps the product grounded in the current codebase while opening a credible path toward an AI discovery and ecosystem platform.
