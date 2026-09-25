import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { latestRatesValidator, ratesByDateValidator, timeseriesValidator } from '#validators/rate'
import { RateService } from '#services/rate_service'
import RateSetTransformer from '#transformers/rate_set_transformer'
import { DateTime } from 'luxon'
import { addYears, isAfter, parseISO } from 'date-fns'
import TimeseriesRateSetTransformer from '#transformers/timeseries_rate_set_transformer'

const ONE_YEAR = 31_536_000
const FIVE_MINUTES = 300

/** Longest timeseries, and the longest one allowed without `symbols`. */
const MAX_YEARS = 5
const MAX_YEARS_ALL_SYMBOLS = 1

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

  // GET /api/v1/rates/latest?base=USD&symbols=EUR,GBP
  async latestRates({ request, response, serialize }: HttpContext) {
    const { base, symbols } = await request.validateUsing(latestRatesValidator)

    const rates = await this.ratesService.listRatesOn(DateTime.now().toISODate()!, {
      base,
      symbols,
    })
    if (!rates) {
      return response.notFound({ message: `No rates found for ${base}` })
    }

    response.header('Cache-Control', `public, max-age=${FIVE_MINUTES}`)
    return serialize.withoutWrapping(RateSetTransformer.transform(rates))
  }

  // GET /api/v1/rates/timeseries?base=USD&symbols=EUR&from=2024-01-01&to=2024-03-31
  async timeseries({ request, response, serialize }: HttpContext) {
    const input = await request.validateUsing(timeseriesValidator)
    const { base, symbols, from } = input
    const to = input.to ?? DateTime.now().toISODate()!

    const start = parseISO(from)
    const end = parseISO(to)
    if (isAfter(start, end)) {
      return response.unprocessableEntity({ message: `from (${from}) is after to (${to})` })
    }
    if (isAfter(end, addYears(start, MAX_YEARS))) {
      return response.unprocessableEntity({
        message: `A timeseries can span at most ${MAX_YEARS} years`,
      })
    }
    if (symbols.length === 0 && isAfter(end, addYears(start, MAX_YEARS_ALL_SYMBOLS))) {
      return response.unprocessableEntity({
        message: `symbols is required for a timeseries longer than ${MAX_YEARS_ALL_SYMBOLS} year`,
      })
    }

    const rates = await this.ratesService.listTimeseriesRates(from, to, { base, symbols })
    if (!rates) {
      return response.notFound({ message: `No rates found for ${base}` })
    }

    // Once `to` is on or before the latest synced day, no new days can join the series.
    // Both are 'yyyy-MM-dd' strings, so string comparison follows the calendar.
    const isFinal = to <= rates.latestDate
    response.header('Cache-Control', `public, max-age=${isFinal ? ONE_YEAR : FIVE_MINUTES}`)

    return serialize.withoutWrapping(TimeseriesRateSetTransformer.transform(rates))
  }
}
