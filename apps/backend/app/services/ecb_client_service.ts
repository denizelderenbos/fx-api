import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import axios from 'axios'
import unzipper from 'unzipper'
import { parseString } from '@fast-csv/parse'

export type EcbRate = { currency: string; rate: string }

/**
 * All rates the ECB published for one day: 1 EUR = rate × currency.
 * Currencies without a rate on that day (N/A in the source) are omitted.
 */
export type EcbDailyRates = {
  date: string // ISO date, e.g. '2026-09-22'
  rates: EcbRate[]
}

type RawRow = Record<string, string>

const HISTORICAL_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.zip'
const RECENT_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.zip'
const REQUEST_TIMEOUT_MS = 30_000

@inject()
export class EcbClientService {
  constructor(protected logger: Logger) {}

  /** Every trading day since 1999. */
  getHistoricalRates(): Promise<AsyncIterable<EcbDailyRates>> {
    return this.fetchRates(HISTORICAL_URL)
  }

  /** The last 90 trading days, same format as the full history. */
  getRecentRates(): Promise<AsyncIterable<EcbDailyRates>> {
    return this.fetchRates(RECENT_URL)
  }

  /**
   * Turns the ECB CSV (one row per day, one column per currency) into
   * a stream of daily rate lists. Parse errors surface as exceptions
   * in the consuming `for await` loop.
   */
  parseRates(csv: string): AsyncIterable<EcbDailyRates> {
    return parseString<RawRow, EcbDailyRates>(csv, {
      headers: true,
      ignoreEmpty: true,
    }).transform((row: RawRow): EcbDailyRates => {
      const { Date: date, ...cells } = row
      const rates = Object.entries(cells)
        .filter(([currency, rate]) => currency !== '' && rate !== 'N/A')
        .map(([currency, rate]) => ({ currency, rate }))
      return { date, rates }
    })
  }

  private async fetchRates(url: string): Promise<AsyncIterable<EcbDailyRates>> {
    const csv = await this.fetchCsv(url)
    return this.parseRates(csv)
  }

  private async fetchCsv(url: string): Promise<string> {
    this.logger.debug({ url }, 'Downloading ECB rates')

    let data: ArrayBuffer
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: REQUEST_TIMEOUT_MS,
      })
      data = response.data
    } catch (error) {
      throw new Error(`Failed to download ECB rates from ${url}`, { cause: error })
    }

    const archive = await unzipper.Open.buffer(Buffer.from(data))
    const file = archive.files.find((entry) => entry.path.endsWith('.csv'))
    if (!file) {
      throw new Error(`No CSV file found in ECB archive ${url}`)
    }

    const csv = await file.buffer()
    return csv.toString('utf8')
  }
}
