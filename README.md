# FDC Agent Frontend

Conversational AI chat interface built on Next.js.

## Tech Stack

| Layer | Tool | Version |
|---|---|---|
| Framework | Next.js | ^16.0.0 (App Router) |
| UI Library | React | ^19.0.0 |
| Language | TypeScript | ^5.0.0 |
| Styling | Tailwind CSS | ^4.0.0 |
| Server State | TanStack Query | ^5.x |
| Client State | Zustand | ^5.x |
| Form | React Hook Form | ^7.x |
| Validation | Zod | ^3.x or ^4.x |
| API Communication | fetch (native) / axios | — |
| Testing (unit) | Vitest + React Testing Library | — |
| Testing (E2E) | Playwright | — |
| Linting | ESLint | (Next.js default config) |
| Formatting | Prettier | — |
| Component Structure | feature-based | (convention) |
| Package Manager | pnpm | ^9.x or higher |
| Runtime | Node.js | **22.22.2** (Node 22 LTS "Jod", pinned via `.nvmrc`) |
| Deployment | Docker | multi-stage image (Dockerfile TBD) |

Library dependencies are pinned in `package.json` once scaffolded — that file is the single source of truth for exact versions.

## Prerequisites

- **Node.js 22.22.2** (Node 22 LTS "Jod") — pinned in `.nvmrc`. With nvm:

  ```sh
  nvm install      # reads .nvmrc → installs 22.22.2
  nvm use          # activates 22.22.2
  ```

  Without nvm: install `v22.22.2` (or the latest `v22.x` patch) from [nodejs.org](https://nodejs.org/).

- **pnpm** — enabled via corepack (bundled with Node 22):

  ```sh
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

- **git** 2.x or higher.

Verify:

```sh
node -v        # → v22.22.2
pnpm -v
git --version
```

## Local Development

> Available after the Next.js scaffolding step lands. Until then, the repository contains design documents (`DESIGN.md`, `api.md`) and these dotfiles only.

```sh
git clone git@github.com:ollybaysion/demo-fe.git
cd demo-fe
pnpm install
pnpm dev         # http://localhost:3000
```

Library dependencies are added when each feature is implemented — not all at once upfront.

## Deployment (Docker)

Production deploys ship as Docker images. The repository root holds a multi-stage `Dockerfile` plus `.dockerignore`.

```sh
docker build -t fdc-agent-fe .
docker run -p 3000:3000 fdc-agent-fe
# → http://localhost:3000
```

**Image strategy**

- `node:22.22.2-alpine` base (matches `.nvmrc`)
- 3 stages: **deps** (pnpm install --frozen-lockfile) → **builder** (next build with `output: 'standalone'`) → **runner** (minimal alpine + non-root `nextjs` user)
- Runtime image carries only `.next/standalone`, `.next/static`, `public/` — final image ~206MB
- `pnpm` version pinned via `package.json#packageManager`, activated through corepack inside the image

**Environment variables**

Inject at run time (not bake into the image) so the same image can ship to multiple environments:

```sh
docker run -p 3000:3000 \
  -e SOME_BACKEND_URL=https://api.example.com \
  fdc-agent-fe
```

The exact set of env vars will grow as backend integrations land; until then the chat UI runs on a self-contained mock SSE route at `/api/chat`.
