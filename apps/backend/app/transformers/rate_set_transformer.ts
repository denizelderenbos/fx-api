import { BaseTransformer } from '@adonisjs/core/transformers'
import { type RateSet } from '#services/rate_service'

export default class RateSetTransformer extends BaseTransformer<RateSet> {
  toObject() {
    const { base, rates, date } = this.resource
    return {
      base,
      date,
      rates,
    }
  }
}
