import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import Rate from '#models/rate'
import { crossRate } from '#helpers/conversion_helper'
import Big from 'big.js'

type DayRate = Record<string, Big>

export type RateSet = {
  base: string
  date: string
  rates: DayRate
  latestDate: string
}

export type TimeseriesRateSet = {
  base: string
  startDate: string
  endDate: string
  latestDate: string
  rates: Record<string, DayRate>
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

    const rates = this.crossRates(result, base)
    if (!rates) return null

    return {
      base: base,
      date: effectiveDateString,
      latestDate: latestDate,
      rates,
    }
  }

  private async latestDate() {
    const newest = await Rate.query().orderBy('date', 'desc').select('date').first()
    return newest?.date.toISODate() ?? null
  }

  async listTimeseriesRates(
    from: string,
    to: string,
    opts: { base: string; symbols: string[] }
  ): Promise<TimeseriesRateSet | null> {
    const latestDate = await this.latestDate()
    if (!latestDate) return null

    const { base, symbols } = opts

    const query = Rate.query().whereBetween('date', [from, to]).orderBy('date', 'asc')
    if (symbols.length > 0) {
      query.whereIn('currency', [base, ...symbols])
    }
    const result = await query.exec()

    const byDate = Object.groupBy(result, ({ date }) => date.toISODate()!)
    const rates: Record<string, DayRate> = {}
    for (const [date, rows = []] of Object.entries(byDate)) {
      const dayRates = this.crossRates(rows, base)
      if (dayRates) rates[date] = dayRates
    }

    const dates = Object.keys(rates)
    if (dates.length === 0) return null

    return {
      base,
      latestDate,
      startDate: dates[0],
      endDate: dates.at(-1)!,
      rates,
    }
  }

  /** Cross rates for one day's rows, or null when the base has no rate that day. */
  private crossRates(rows: Rate[], base: string): DayRate | null {
    const baseRow = rows.find((row) => row.currency === base)
    if (!baseRow) return null

    const baseRate = Big(baseRow.rate)
    return Object.fromEntries(
      rows
        .filter((row) => row.currency !== base)
        .map((row) => [row.currency, crossRate(baseRate, Big(row.rate))])
    )
  }
}
