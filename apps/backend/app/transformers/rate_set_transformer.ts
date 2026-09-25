import { BaseTransformer } from '@adonisjs/core/transformers'
import { type RateSet } from '#services/rate_service'

/** Rates are exposed as strings with six decimals, so the JSON carries no float noise. */
const DECIMALS = 6

export default class RateSetTransformer extends BaseTransformer<RateSet> {
  toObject() {
    const { base, rates, date } = this.resource
    return {
      base,
      date,
      rates: Object.fromEntries(
        Object.entries(rates).map(([currency, rate]) => [currency, rate.toFixed(DECIMALS)])
      ),
    }
  }
}
