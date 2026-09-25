/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  currencies: {
    index: typeof routes['currencies.index']
  }
  rates: {
    latestRates: typeof routes['rates.latest_rates']
    ratesByDate: typeof routes['rates.rates_by_date']
  }
}
