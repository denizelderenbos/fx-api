import { BaseTransformer } from '@adonisjs/core/transformers'
import type Currency from '#models/currency'

export default class CurrencyTransformer extends BaseTransformer<Currency> {
  toObject() {
    return {
      code: this.resource.code,
      name: this.resource.name,
      is_active: this.resource.isActive,
      first_date: this.resource.firstDate?.toISODate() ?? null,
      last_date: this.resource.lastDate?.toISODate() ?? null,
    }
  }
}
