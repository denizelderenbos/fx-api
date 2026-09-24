import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import Rate from '#models/rate'

export type RateSet = {
  base: string
  date: string
  rates: Record<string, number>
  latestDate: string
}

@inject()
export class RateService {
  constructor(protected logger: Logger) {}

  async listRatesOn(
    requestedDate: string,
    opts: { symbols: string[]; base: string }
  ): Promise<RateSet | null> {
    const latestDate = await this.latestDate()
    if (!latestDate) return null // nog nooit gesynct

    const result = await Rate.query()
      .where('date', '=', requestedDate)
      .whereIn('currency', [opts.base, ...opts.symbols])

    return {
      base: opts.base,
      date: requestedDate,
      latestDate: latestDate,
      rates: Object.fromEntries(result.map((row) => [row.currency, Number(row.rate)])),
    }
  }

  private async latestDate() {
    const newest = await Rate.query().orderBy('date', 'desc').select('date').first()
    return newest?.date.toISODate() ?? null
  }
}
