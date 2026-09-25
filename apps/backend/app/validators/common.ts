import vine from '@vinejs/vine'

/** ISO 4217 code, accepted in any case: 'usd' becomes 'USD'. */
export const currencyCode = () =>
  vine
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
