# web

Public visitor website — **Next.js 15** scaffold (Commit-0003).

## Stack

| Technology | Purpose |
|---|---|
| Next.js 15 | App Router framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | UI primitives (`src/components/ui`) |
| TanStack Query | Server state (`src/app/providers.tsx`) |
| next-intl | i18n (`en`, `zh`) |
| Metadata API + `src/lib/seo.ts` | SEO defaults (App Router equivalent of next-seo) |

## Development

From repository root:

```bash
pnpm install
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000).

**Status:** Framework scaffold only — no business pages.
