import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ratesByDateValidator } from '#validators/rate'
import { RateService } from '#services/rate_service'
import RateSetTransformer from '#transformers/rate_set_transformer'

const ONE_YEAR = 31_536_000
const FIVE_MINUTES = 300

@inject()
export default class RatesController {
  constructor(private readonly ratesService: RateService) {}

  async ratesByDate({ request, response, serialize }: HttpContext) {
    const { base, symbols, params } = await request.validateUsing(ratesByDateValidator)

    const rates = await this.ratesService.listRatesOn(params.date, { base, symbols })
    if (!rates) {
      return response.notFound({ message: `No rates found for ${base} on ${params.date}` })
    }

    // Als de aangevraagde datum op of vóór de latestDate ligt, is het antwoord definitief.
    // Beide datums zijn 'yyyy-MM-dd'-strings, dus de stringvergelijking volgt de kalender.
    const isFinal = params.date <= rates.latestDate
    response.header('Cache-Control', `public, max-age=${isFinal ? ONE_YEAR : FIVE_MINUTES}`)

    return serialize.withoutWrapping(RateSetTransformer.transform(rates))
  }
}
