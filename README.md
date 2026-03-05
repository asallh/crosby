# Crosby IQ

> [!TIP] Vibecoding experiment
> This repo is part of a vibecoding experiment.

Modern NHL projections and matchup intelligence. Built with Next.js, Prisma, and a Postgres container, powered by the NHL Web API reference.

## Stack

- Next.js App Router + Tailwind
- Prisma + Postgres (Docker Compose)
- Data ingestion worker (manual run)

## Quick Start

1. Start Postgres

```bash
docker compose up -d
```

2. Install deps

```bash
pnpm install
```

3. Generate Prisma client + migrate

```bash
pnpm db:generate
pnpm db:migrate
```

4. Validate NHL API endpoints

```bash
pnpm validate-api
```

5. Seed data

```bash
pnpm db:seed
```

6. Run the app

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Worker

Refresh data (standings, schedule, logs, projections):

```bash
pnpm worker
```

## Notes

- `docker-compose.yaml` only runs Postgres. Next.js stays local.
- Headshots and team logos are stored as remote URLs from the NHL API.
- The projection model is a weighted PPG blend with opponent defense and home-ice adjustments.

## API Reference

NHL API reference: `https://github.com/Zmalski/NHL-API-Reference`
