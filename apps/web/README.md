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

Open [http://localhost:3000](http://localhost:3000) (redirects to `/en`).

**Status:** Framework scaffold only — no business pages.

## Troubleshooting

### `localhost:3000` refused to connect (-102)

This means **nothing is listening on port 3000 on the machine where your browser runs**.

1. **Local development** — run the dev server in your repo (not only in a remote agent):
   ```bash
   git checkout cursor/add-techstack-docs-c760   # main has no apps/web yet
   pnpm install
   pnpm dev:web
   ```
   Wait for `Ready` in the terminal, then open http://localhost:3000.

2. **Cursor remote / Cloud Agent** — the server runs in the remote VM. Open the **Ports** panel, forward port **3000**, and use the forwarded URL (or ensure port 3000 is marked as forwarded). `localhost` in your browser refers to your PC, not the remote environment.

3. **Wrong branch** — `main` does not include `apps/web` or `pnpm dev:web`. Switch to a branch that contains the web scaffold (e.g. `cursor/add-techstack-docs-c760`).

4. **Port in use** — if 3000 is taken, stop the other process or change the port in `package.json` (`dev` / `start` scripts).
