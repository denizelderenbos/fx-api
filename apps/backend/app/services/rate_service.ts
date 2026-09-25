import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import Rate from '#models/rate'
import { crossRate } from '#helpers/conversion_helper'
import Big from 'big.js'

export type RateSet = {
  base: string
  date: string
  rates: Record<string, Big>
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
    if (!latestDate) return null

    const { base, symbols } = opts

    const effectiveDate = await Rate.query()
      .select('date')
      .where('date', '<=', requestedDate)
      .orderBy('date', 'desc')
      .first()
    if (effectiveDate === null) return null
    const effectiveDateString = effectiveDate.date.toISODate()!

    const query = Rate.query().where('date', '=', effectiveDateString).orderBy('currency', 'asc')
    if (symbols.length > 0) {
      query.whereIn('currency', [base, ...symbols])
    }
    const result = await query.exec()

    // Convert the rates
    const baseRate = result.find((rate) => rate.currency === base)
    if (!baseRate) return null

    return {
      base: base,
      date: effectiveDateString,
      latestDate: latestDate,
      rates: Object.fromEntries(
        result
          .filter((curr) => curr.currency !== base)
          .map((row) => [row.currency, crossRate(Big(baseRate.rate), Big(row.rate))])
      ),
    }
  }

  private async latestDate() {
    const newest = await Rate.query().orderBy('date', 'desc').select('date').first()
    return newest?.date.toISODate() ?? null
  }
}
