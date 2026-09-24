import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import CurrencyTransformer from '#transformers/currency_transformer'
import { getCurrenciesValidator } from '#validators/currency'
import { CurrencyService } from '#services/currency_service'

@inject()
export default class CurrenciesController {
  constructor(private readonly currencyService: CurrencyService) {}
  async index({ serialize, request, response }: HttpContext) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { is_active } = await request.validateUsing(getCurrenciesValidator)
    const currencies = await this.currencyService.listCurrencies({ isActive: is_active })

    if (is_active === undefined && currencies.length === 0) {
      return response.serviceUnavailable({ message: 'No syncs yet' })
    }

    response.header('Cache-Control', 'public, max-age=300')
    return serialize(CurrencyTransformer.transform(currencies))
  }
}
