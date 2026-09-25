import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import Big from 'big.js'
import { convertValidator } from '#validators/conversion'
import { RateService } from '#services/rate_service'
import ConversionTransformer from '#transformers/conversion_transformer'
import { cacheControl } from '#helpers/cache_helper'

@inject()
export default class ConversionsController {
  constructor(private readonly ratesService: RateService) {}

  // GET /api/v1/convert?from=USD&to=GBP&amount=100&date=2024-01-15
  async show({ request, response, serialize }: HttpContext) {
    const input = await request.validateUsing(convertValidator)
    const { from, to, amount } = input
    const date = input.date ?? DateTime.now().toISODate()!

    const conversion = await this.ratesService.convert(date, { from, to, amount: Big(amount) })
    if (!conversion) {
      return response.notFound({ message: `No rate found from ${from} to ${to} on ${date}` })
    }

    // Without an explicit date the answer moves with every sync, so it is never final.
    const isFinal = input.date !== undefined && input.date <= conversion.latestDate
    response.header('Cache-Control', cacheControl(isFinal))

    return serialize.withoutWrapping(ConversionTransformer.transform(conversion))
  }
}
