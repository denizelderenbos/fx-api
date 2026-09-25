import type Big from 'big.js'

export function crossRate(baseRate: Big, quoteRate: Big) {
  return quoteRate.div(baseRate)
}
