# admin

Admin dashboard — **Next.js 15** scaffold (Commit-0005).

## Stack

| Technology | Purpose |
|---|---|
| Next.js 15 | App Router admin UI |
| Tailwind CSS | Styling |
| shadcn/ui | UI primitives (`src/components/ui`) |
| RBAC Layout | Permission-filtered sidebar and route gates |
| Dashboard | Overview page with role-aware widgets |

## Development

From repository root:

```bash
pnpm install
pnpm dev:admin
```

Open [http://localhost:3001](http://localhost:3001).

### RBAC mock roles

Set `NEXT_PUBLIC_ADMIN_MOCK_ROLE` to switch the mock session:

| Value | Visible navigation |
|---|---|
| `admin` (default) | Dashboard, Tools, Categories, Users, Settings |
| `editor` | Dashboard, Tools, Categories |

Example:

```bash
NEXT_PUBLIC_ADMIN_MOCK_ROLE=editor pnpm dev:admin
```

**Status:** Framework scaffold only — no business pages or API integration yet.
