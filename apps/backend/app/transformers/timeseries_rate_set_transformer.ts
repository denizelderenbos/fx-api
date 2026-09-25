import { BaseTransformer } from '@adonisjs/core/transformers'
import { type TimeseriesRateSet } from '#services/rate_service'

/** Rates are exposed as strings with six decimals, so the JSON carries no float noise. */
const DECIMALS = 6

export default class TimeseriesRateSetTransformer extends BaseTransformer<TimeseriesRateSet> {
  toObject() {
    const { base, startDate, endDate, rates } = this.resource
    return {
      base,
      start_date: startDate,
      end_date: endDate,
      rates: Object.fromEntries(
        Object.entries(rates).map(([date, dayRates]) => [
          date,
          Object.fromEntries(
            Object.entries(dayRates).map(([currency, rate]) => [currency, rate.toFixed(DECIMALS)])
          ),
        ])
      ),
    }
  }
}
