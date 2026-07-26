# Auto Discovered Merge Checklist

## Purpose

This checklist classifies the `82` reviewed auto-discovered tools into:

1. tools that will update existing records
2. tools that should create new records
3. tools that are still worth manual review before production import

It is intended to support final launch approval before running:

```bash
pnpm db:seed
```

## Summary

- Auto-discovered dataset size: `82`
- Expected update/merge into existing records: `7`
- Expected new tool creates: `75`
- High-signal manual review set: present below

## Category Coverage

- `ai-research`: `10`
- `ai-image`: `9`
- `ai-coding`: `8`
- `ai-business`: `8`
- `ai-video`: `6`
- `ai-writing`: `6`
- `ai-design`: `5`
- `ai-education`: `5`
- `ai-social-media`: `5`
- `ai-audio`: `4`
- `ai-agents`: `3`
- `ai-marketing`: `3`
- `ai-seo`: `3`
- `ai-productivity`: `3`
- `ai-data`: `1`
- `ai-developer-tools`: `1`
- `ai-presentation`: `1`
- `ai-chatbots`: `1`

## Will Update Existing Tools

These should merge into existing records instead of creating duplicates.

| Name | Slug | Website | Match Reason |
|---|---|---|---|
| ChatGPT | `chatgpt` | `https://chatgpt.com` | `slug`, `name`, `websiteHost` |
| Claude | `claude` | `https://claude.ai` | `slug`, `name`, `websiteHost` |
| Frase | `frase` | `https://www.frase.io/tools` | `slug`, `name`, `websiteHost` |
| Google Gemini | `google-gemini` | `https://gemini.google.com` | `websiteHost` |
| Midjourney | `midjourney` | `https://www.midjourney.com/home` | `slug`, `name`, `websiteHost` |
| Perplexity | `perplexity` | `https://pplx.ai` | `slug`, `name` |
| Replit | `replit` | `https://replit.com` | `websiteHost` |

## Expected New Creates

Expected new creates after overlap protection: `75`

Representative examples:

- `AgentGPT`
- `AgentVerse`
- `Andi`
- `Browse`
- `Chatbase`
- `Consensus`
- `Fast.ai`
- `Julius`
- `Merlin`
- `Scite`
- `TutorAI`
- `ZenCall.ai`
- `Windsurf`
- `Tabnine`
- `OpenDeck`

## Recommended Manual Review Before Production Import

These tools are not blocked, but they are worth one final human pass because of naming, landing page style, or marketing-heavy positioning.

### Group A: Generic or ambiguous naming

- `AI Agents`
- `Frontpage`
- `Story Notes`
- `SearchQ`

### Group B: Marketing-heavy or landing-page style tools

- `AI Agents`
- `MagicForm`
- `Spira`
- `UGCfy`
- `VisibAI`
- `HookTide`
- `Pounce`

### Group C: Domain or path worth sanity checking

- `HubSpot`
- `Karpo`
- `Monica`
- `SupaImagine | AI Video Generator`
- `MojoMake - AI Image to Video Generator`
- `MCP Server & CLI by Picsart`

### Group D: Content quality worth reviewing even though import is valid

- `Frase`
- `Replit`
- `Acurio`
- `AnimatePhoto.io`
- `Create3D.io`
- `Consistent Character AI`
- `MakeMyWorksheet`
- `Matterhound — Get lawyer quotes free`

## Production Approval Questions

Before import, confirm:

1. Are the `7` overlapping tools allowed to update existing published records?
2. Are `Hostinger`-branded tools acceptable in the public catalog?
3. Are tools with highly promotional positioning acceptable without another content rewrite pass?
4. Should the manual review set be imported immediately, or held for a second editorial pass?

## Recommended Import Decision

If speed is the priority:

- import all `82`
- rely on overlap protection for the `7` matching records
- manually spot-check the review set after import

If quality is the priority:

- import the `7` overlap updates plus the strongest `50-60` new tools first
- hold the manual review set for a second content pass

## Commands

Overlap audit:

```bash
pnpm tools:auto-update:audit-overlaps
```

Dataset validation:

```bash
pnpm tools:auto-update:validate-review docs/import/auto-discovered-tools-2026-07-08.json
node prisma/seeds/validate-auto-discovered-tools.ts
```

Seed import:

```bash
pnpm db:generate
pnpm db:seed
```
