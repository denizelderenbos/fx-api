# FX API

Exchange rates from the European Central Bank, synced into Postgres and served through a small JSON API.

## Getting started

Requirements: Node.js 24 or newer and Docker.

```bash
# Install dependencies
npm install

# Start Postgres
docker compose up -d

# Create the backend environment file with a fresh APP_KEY
cp apps/backend/.env.example apps/backend/.env
(cd apps/backend && node ace generate:key)

# Run the migrations and import the full ECB history (takes a few seconds)
npm run setup

# Start the development server on http://localhost:3333
npm run dev
```

`npm run setup` is safe to run again: migrations that already ran are skipped, and so is the history import once it has succeeded.

## Keeping rates up to date

The ECB publishes new reference rates on working days at around 16:00 CET. `node ace fx:sync` (from `apps/backend`) brings the database up to date:

- **Fresh install:** the history has never been imported, so it imports the full history, back to 4 January 1999.
- **After that:** it imports the last 90 days, so days that were missed are filled in automatically.

Every run is recorded in the `sync_runs` table, and running it more than once is always safe.

### Scheduling with cron

Run the sync with system cron at 16:15, 17:15 and 18:15 on weekdays, Europe/Amsterdam time. The later runs pick up a late publication. Use the wrapper script `apps/backend/cron/fx_sync.sh`. Cron starts with an almost empty environment, so the script finds `node` itself (also through nvm) and appends its output to `apps/backend/tmp/logs/fx_sync.log`.

```bash
crontab -e
```

```
15 16-18 * * 1-5 /path/to/fx-api/apps/backend/cron/fx_sync.sh
```

Cron uses the system timezone. On a server that runs in UTC, set `CRON_TZ=Europe/Amsterdam` if your cron supports it, or shift the hours. See `apps/backend/cron/crontab.example`.

Postgres has to be running when the sync starts. A failed or missed run (for example because the machine was asleep) is picked up by the next one.

### Manual commands

| Command                             | What it does                                         |
| ----------------------------------- | ---------------------------------------------------- |
| `node ace fx:sync`                  | Last 90 days, or the full history when it is missing |
| `node ace fx:backfill`              | Always imports the full history                      |
| `node ace fx:backfill --if-missing` | Full history, skipped when it was already imported   |
