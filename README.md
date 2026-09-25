# FX API

Exchange rates from the European Central Bank, synced into Postgres and served through a small JSON API.

The ECB publishes reference rates against the euro for around 30 currencies, every working day since 4 January 1999. Only those euro rates are stored, one row per day and currency. Every other pair is computed on request:

```
rate(A → B) = rate(EUR → B) / rate(EUR → A)
```

Built with [AdonisJS](https://adonisjs.com) and TypeScript in an npm workspaces monorepo. Calculations use [big.js](https://github.com/MikeMcl/big.js), so no floating point errors end up in the rates.

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

## API

All endpoints are public and return JSON. The base URL during development is `http://localhost:3333/api/v1`.

| Endpoint                | Returns                                          |
| ----------------------- | ------------------------------------------------ |
| `GET /currencies`       | All known currencies                             |
| `GET /rates/latest`     | Rates of the most recent trading day             |
| `GET /rates/:date`      | Rates of a given day                             |
| `GET /rates/timeseries` | Rates per trading day over a period              |
| `GET /convert`          | An amount converted from one currency to another |

### Conventions

- **Currency codes** are ISO 4217 codes such as `USD`, in any case: `usd` works too.
- **`base`** is the currency the rates are expressed against, `EUR` when omitted. **`symbols`** is a comma-separated list of currencies to return, all of them when omitted.
- **Rates and results are strings** with six decimals, such as `"0.913910"`, so no floating point noise ends up in the JSON. Round them for display in the client.
- **Weekends and holidays** have no rates. A date without rates falls back to the last trading day before it, and `date` in the response is always the day that was actually used.
- **Dates** are in `YYYY-MM-DD` format.

### `GET /currencies`

Every currency the ECB has ever published, with the first and last day it has a rate. `?is_active=true` returns only currencies with a rate on the latest synced day, `?is_active=false` only discontinued ones.

```json
{
  "data": [
    {
      "code": "AUD",
      "name": "Australian Dollar",
      "is_active": true,
      "first_date": "1999-01-04",
      "last_date": "2026-09-24"
    }
  ]
}
```

### `GET /rates/latest`

```
GET /rates/latest?base=USD&symbols=EUR,GBP
```

```json
{ "base": "USD", "date": "2026-09-24", "rates": { "EUR": "0.879740", "GBP": "0.756453" } }
```

### `GET /rates/:date`

Saturday 13 January 2024 falls back to Friday the 12th:

```
GET /rates/2024-01-13?base=USD&symbols=EUR,GBP
```

```json
{ "base": "USD", "date": "2024-01-12", "rates": { "EUR": "0.913910", "GBP": "0.785505" } }
```

A date in the future returns the latest rates.

### `GET /rates/timeseries`

Rates for every trading day between `from` and `to`. `to` is optional and defaults to today. `start_date` and `end_date` are the first and last trading day actually in the series.

```
GET /rates/timeseries?base=USD&symbols=EUR&from=2024-01-12&to=2024-01-16
```

```json
{
  "base": "USD",
  "start_date": "2024-01-12",
  "end_date": "2024-01-16",
  "rates": {
    "2024-01-12": { "EUR": "0.913910" },
    "2024-01-15": { "EUR": "0.913659" },
    "2024-01-16": { "EUR": "0.918949" }
  }
}
```

A series spans at most 5 years, and `symbols` is required when it spans more than 1 year.

### `GET /convert`

`from`, `to` and a positive `amount` are required. `date` is optional and defaults to the latest synced day.

```
GET /convert?from=USD&to=GBP&amount=100&date=2024-01-15
```

```json
{
  "from": "USD",
  "to": "GBP",
  "date": "2024-01-15",
  "amount": "100",
  "rate": "0.786432",
  "result": "78.643216"
}
```

### Errors

| Status | When                                                                                                                  | Body                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `422`  | Invalid input: a malformed date or currency code, a non-positive amount, `from` after `to`, a period that is too long | `{ "errors": [{ "field": "amount", "rule": "positive", "message": "..." }] }` or `{ "message": "..." }` |
| `404`  | An unknown currency, a currency without a rate on that day, or a date before 4 January 1999                           | `{ "message": "No rate found from USD to XYZ on 2026-09-25" }`                                          |
| `503`  | `/currencies` before the first sync                                                                                   | `{ "message": "No syncs yet" }`                                                                         |
| `429`  | Too many requests, see [Rate limits](#rate-limits)                                                                    | `{ "errors": [{ "message": "Too many requests", "retryAfter": 60 }] }`                                  |

### Rate limits

Requests are limited per client IP address:

| Endpoint            | Limit                  |
| ------------------- | ---------------------- |
| `/rates/timeseries` | 10 requests per minute |
| Everything else     | 60 requests per minute |

The two limits are counted separately. Every response has `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers. Above the limit the API answers `429` with `Retry-After` (seconds) and `X-RateLimit-Reset` (an ISO timestamp) headers, and no `Cache-Control`.

### Caching

Every response has a `Cache-Control` header:

- **`public, max-age=31536000`** (one year) for an explicit date on or before the latest synced day. That answer will not change anymore.
- **`public, max-age=300`** (five minutes) for everything that can still change with the next sync: `/currencies`, `/rates/latest`, dates in the future, and a timeseries or conversion without `to` or `date`.

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

## Deploying behind a proxy

The rate limits count per `request.ip()`. Behind a reverse proxy or load balancer, every request arrives from the proxy, so the real client IP has to come from the `X-Forwarded-For` header. The API only trusts that header from proxies listed in `TRUSTED_PROXIES` in `apps/backend/.env`, because any other client could forge it:

| Setup                                        | `TRUSTED_PROXIES`                     |
| -------------------------------------------- | ------------------------------------- |
| No proxy, or nginx/Caddy on the same machine | leave it out (defaults to `loopback`) |
| Proxy in another Docker container            | `loopback,uniquelocal`                |
| Load balancer in a private network           | its subnet, such as `10.0.0.0/16`     |

Values are [proxy-addr](https://www.npmjs.com/package/proxy-addr) names, IPs or CIDR ranges, comma-separated. An invalid value stops the app at startup. Never trust more than your own proxies: a range that also covers the internet lets clients pick their own IP and bypass the rate limits.

To check a deployment, look at the keys in the `rate_limits` table: they should hold real client IPs, not the address of the proxy.

## Development

Run these from the repository root:

| Command             | What it does                             |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Development server with hot reload       |
| `npm run test`      | All tests                                |
| `npm run typecheck` | TypeScript type check                    |
| `npm run lint`      | ESLint                                   |
| `npm run format`    | Prettier                                 |
| `npm run build`     | Production build in `apps/backend/build` |

The tests need Postgres running. They use a separate `fx_api_test` database, which `docker compose` creates the first time it starts, so they never touch your development data. Functional tests call the endpoints through HTTP; the ECB is never contacted during tests.

A Postman collection with example requests is in `apps/backend/postman`. Every request has tests. Import both the collection and the `FX API lokaal` environment, which points to `http://localhost:3333`, or run it against the running development server from the command line:

```bash
npx newman run apps/backend/postman/fx-api.postman_collection.json \
  -e apps/backend/postman/fx-api-lokaal.postman_environment.json
```

## Project structure

```
apps/
  backend/                 AdonisJS API
    app/
      controllers/         HTTP layer: validate, call a service, transform
      services/            Business logic: ECB client, import, sync, rates
      models/              Lucid models: currencies, rates, sync_runs
      validators/          VineJS validators for query parameters
      transformers/        Shape of the JSON responses
      helpers/             Cross rate calculation, Cache-Control values
    commands/              fx:sync and fx:backfill
    cron/                  Cron wrapper script and crontab example
    database/migrations/   Database schema
    postman/               Postman collection and environment
    start/routes.ts        Route definitions
    tests/                 Unit and functional tests (Japa)
  frontend/                Placeholder for a frontend
docker/postgres/init/      Creates the test database on first start
compose.yaml               Local Postgres
```
