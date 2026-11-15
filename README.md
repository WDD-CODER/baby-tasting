# Baby Tasting

Mobile-first Hebrew (RTL) web app for planning and recording a baby's food tasting.
Angular frontend at the repo root, Express API in `server/`. See `docs/briefs/00-program.md`.

## Requirements

- Node 22.9 or newer (`.nvmrc` pins 24)
- pnpm (`corepack enable`)

## Run locally (PowerShell)

Install dependencies once, from the repo root:

```powershell
cd "C:\coding projects\Cursor\baby-tasting"
pnpm install
```

Frontend (http://localhost:4200):

```powershell
pnpm start
```

Server (http://localhost:3000/api/v1/health), in a second terminal:

```powershell
Copy-Item server\.env.example server\.env
pnpm --dir server dev
```

## Checks

```powershell
pnpm run build
pnpm run lint
pnpm run test
pnpm --dir server test
```
