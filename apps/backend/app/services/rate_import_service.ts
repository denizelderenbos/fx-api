import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { currencies as isoCurrencies } from 'countries-list/currencies'
import { DateTime } from 'luxon'
import type { EcbRateFeed } from '#services/ecb_client_service'

/**
 * Currencies the ECB has published rates for that no longer exist and
 * are therefore missing from countries-list.
 */
export const LEGACY_CURRENCIES: Record<string, string> = {
  BGN: 'Bulgarian lev',
  CYP: 'Cypriot pound',
  EEK: 'Estonian kroon',
  HRK: 'Croatian kuna',
  LTL: 'Lithuanian litas',
  LVL: 'Latvian lats',
  MTL: 'Maltese lira',
  ROL: 'Romanian leu (old)',
  SIT: 'Slovenian tolar',
  SKK: 'Slovak koruna',
  TRL: 'Turkish lira (old)',
}

const BASE_CURRENCY = 'EUR'
const CHUNK_SIZE = 1000

type RateRow = {
  date: string
  currency: string
  rate: string
  created_at: string
  updated_at: string
}

export type ImportResult = {
  days: number
  rates: number
  /** Most recent date in the imported data (ISO), null when the stream was empty. */
  latestDate: string | null
  /** Codes that were in the ECB data but not in our currency list. Stored under their own code as name. */
  unknownCurrencies: string[]
}

@inject()
export class RateImportService {
  constructor(protected logger: Logger) {}

  /**
   * Upserts every rate from the stream and refreshes the currency metadata,
   * all inside one transaction. Safe to run repeatedly.
   */
  async import(days: EcbRateFeed): Promise<ImportResult> {
    return db.transaction(async (trx) => {
      const now = DateTime.now().toISO()
      const known = await this.syncCurrencies(trx, now)
      const unknown = new Set<string>()
      const buffer: RateRow[] = []
      let dayCount = 0
      let rateCount = 0
      let latestDate: string | null = null

      const flush = async () => {
        if (buffer.length === 0) return
        await this.upsertRates(trx, buffer.splice(0))
      }

      for await (const day of days) {
        dayCount++
        if (latestDate === null || day.date > latestDate) latestDate = day.date
        buffer.push({
          date: day.date,
          currency: BASE_CURRENCY,
          rate: '1',
          created_at: now,
          updated_at: now,
        })

        for (const { currency, rate } of day.rates) {
          if (!known.has(currency)) {
            await this.addUnknownCurrency(trx, currency, now)
            known.add(currency)
            unknown.add(currency)
          }
          buffer.push({ date: day.date, currency, rate, created_at: now, updated_at: now })
        }
        rateCount += 1 + day.rates.length

        if (buffer.length >= CHUNK_SIZE) await flush()
      }
      await flush()

      await this.refreshCurrencyMetadata(trx)

      return {
        days: dayCount,
        rates: rateCount,
        latestDate,
        unknownCurrencies: [...unknown].sort(),
      }
    })
  }

  /** Makes sure every currency we know by name exists. Returns the known codes. */
  private async syncCurrencies(trx: TransactionClientContract, now: string): Promise<Set<string>> {
    const names = new Map<string, string>(Object.entries(LEGACY_CURRENCIES))
    for (const [code, { name }] of Object.entries(isoCurrencies)) {
      names.set(code, name)
    }

    const rows = [...names].map(([code, name]) => ({
      code,
      name,
      created_at: now,
      updated_at: now,
    }))
    await trx.table('currencies').multiInsert(rows).onConflict('code').merge(['name', 'updated_at'])

    return new Set(names.keys())
  }

  private async addUnknownCurrency(trx: TransactionClientContract, code: string, now: string) {
    this.logger.warn(
      { code },
      'ECB publishes a currency we have no name for, storing it under its code'
    )
    await trx
      .table('currencies')
      .insert({ code, name: code, created_at: now, updated_at: now })
      .onConflict('code')
      .ignore()
  }

  private async upsertRates(trx: TransactionClientContract, rows: RateRow[]) {
    await trx
      .table('rates')
      .multiInsert(rows)
      .onConflict(['date', 'currency'])
      .merge(['rate', 'updated_at'])
  }

  /**
   * first_date/last_date per currency, and is_active for every currency
   * that has a rate on the most recent date in the table.
   */
  private async refreshCurrencyMetadata(trx: TransactionClientContract) {
    await trx.rawQuery(`
      with per_currency as (
        select currency, min(date) as first_date, max(date) as last_date
        from rates
        group by currency
      ),
      latest as (
        select max(date) as sync_date from rates
      )
      update currencies
      set first_date = per_currency.first_date,
          last_date  = per_currency.last_date,
          is_active  = (per_currency.last_date = latest.sync_date)
      from per_currency, latest
      where currencies.code = per_currency.currency
    `)
  }
}
