import { BaseTransformer } from '@adonisjs/core/transformers'
import { type Conversion } from '#services/rate_service'

/** Rates and results are exposed as strings with six decimals, so the JSON carries no float noise. */
const DECIMALS = 6

export default class ConversionTransformer extends BaseTransformer<Conversion> {
  toObject() {
    const { from, to, date, amount, rate, result } = this.resource
    return {
      from,
      to,
      date,
      amount: amount.toString(),
      rate: rate.toFixed(DECIMALS),
      result: result.toFixed(DECIMALS),
    }
  }
}
