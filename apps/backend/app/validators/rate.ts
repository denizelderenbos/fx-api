import vine from '@vinejs/vine'

const DEFAULT_BASE = 'EUR'

/** ISO 4217 code, accepted in any case: 'usd' becomes 'USD'. */
const currencyCode = () =>
  vine
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)

/**
 * `symbols` arrives as one query string value, 'EUR,GBP'. Split it before
 * validation so every code is checked individually. Omitted means "all
 * active currencies", represented as an empty array.
 */
const symbols = () =>
  vine
    .array(currencyCode())
    .parse((value) => {
      if (value === undefined) return []
      return typeof value === 'string' ? value.split(',') : value
    })
    .distinct()

/** Query parameters shared by every rates endpoint. */
const rateQuery = {
  /** Defaults to EUR. */
  base: currencyCode().parse((value) => value ?? DEFAULT_BASE),
  /** Empty array means every active currency. */
  symbols: symbols(),
}

/** GET /api/v1/rates/latest?base=USD&symbols=EUR,GBP */
export const latestRatesValidator = vine.create(rateQuery)

/** GET /api/v1/convert?from=USD&to=GBP&amount=100&date=2024-01-15 */
export const convertValidator = vine.create({
  from: currencyCode(),
  to: currencyCode(),
  amount: vine.number().positive(),
  /** Omitted means the latest synced day. */
  date: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .optional()
    .transform((value) => value.toISODate()!),
})

/** GET /api/v1/rates/timeseries?base=USD&symbols=EUR&from=2024-01-01&to=2024-03-31 */
export const timeseriesValidator = vine.create({
  ...rateQuery,
  from: vine.date({ formats: ['YYYY-MM-DD'] }).transform((value) => value.toISODate()!),
  /** Omitted means up to the latest synced day. */
  to: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .optional()
    .transform((value) => value.toISODate()!),
})

/** GET /api/v1/rates/2024-01-15?base=USD&symbols=EUR,GBP */
export const ratesByDateValidator = vine.create({
  ...rateQuery,
  params: vine.object({
    /** Only real dates in ISO format; handed on as a 'yyyy-MM-dd' string. */
    date: vine.date({ formats: ['YYYY-MM-DD'] }).transform((value) => value.toISODate()!),
  }),
})
