import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import Currency from '#models/currency'

@inject()
export class CurrencyService {
  constructor(protected logger: Logger) {}
  async listCurrencies(opts: { isActive?: boolean }) {
    const query = Currency.query().whereNotNull('firstDate').orderBy('code')

    if (opts.isActive !== undefined) {
      query.where('isActive', opts.isActive)
    }

    return query
  }
}
