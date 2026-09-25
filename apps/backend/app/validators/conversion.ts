import vine from '@vinejs/vine'
import { currencyCode } from '#validators/common'

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
