import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import axios from 'axios'
import unzipper from 'unzipper'
import { parseString } from '@fast-csv/parse'
import { XMLParser } from 'fast-xml-parser'

export type EcbRate = { currency: string; rate: string }

/**
 * All rates the ECB published for one day: 1 EUR = rate × currency.
 * Currencies without a rate on that day are omitted.
 */
export type EcbDailyRates = {
  date: string // ISO date, e.g. '2026-09-22'
  rates: EcbRate[]
}

/** A sequence of trading days, streamed (CSV) or in memory (XML). */
export type EcbRateFeed = Iterable<EcbDailyRates> | AsyncIterable<EcbDailyRates>

type RawCsvRow = Record<string, string>
type XmlCurrencyCube = { currency: string; rate: string }
type XmlDayCube = { time: string; Cube?: XmlCurrencyCube[] }
type XmlEnvelope = { 'gesmes:Envelope': { Cube: { Cube?: XmlDayCube[] } } }

const BASE_URL = 'https://www.ecb.europa.eu/stats/eurofxref/'
/** Full history since 1999, CSV inside a zip. */
const HISTORICAL_URL = `${BASE_URL}eurofxref-hist.zip`
/** Last 90 calendar days, XML. */
const RECENT_URL = `${BASE_URL}eurofxref-hist-90d.xml`
/** Latest trading day only, XML. */
const DAILY_URL = `${BASE_URL}eurofxref-daily.xml`
const REQUEST_TIMEOUT_MS = 30_000

const DAY_PATH = 'gesmes:Envelope.Cube.Cube'
const RATE_PATH = 'gesmes:Envelope.Cube.Cube.Cube'

@inject()
export class EcbClientService {
  constructor(protected logger: Logger) {}

  /** Every trading day since 1999. */
  async getHistoricalRates(): Promise<EcbRateFeed> {
    const csv = await this.fetchZippedCsv(HISTORICAL_URL)
    return this.parseCsvRates(csv)
  }

  /** The trading days of the last 90 calendar days. */
  async getRecentRates(): Promise<EcbRateFeed> {
    const xml = await this.fetchText(RECENT_URL)
    return this.parseXmlRates(xml)
  }

  /** The most recent trading day. */
  async getDailyRates(): Promise<EcbRateFeed> {
    const xml = await this.fetchText(DAILY_URL)
    return this.parseXmlRates(xml)
  }

  /**
   * Turns the ECB CSV (one row per day, one column per currency) into
   * a stream of daily rate lists. Parse errors surface as exceptions
   * in the consuming `for await` loop.
   */
  parseCsvRates(csv: string): AsyncIterable<EcbDailyRates> {
    return parseString<RawCsvRow, EcbDailyRates>(csv, {
      headers: true,
      ignoreEmpty: true,
    }).transform((row: RawCsvRow): EcbDailyRates => {
      const { Date: date, ...cells } = row
      const rates = Object.entries(cells)
        .filter(([currency, rate]) => currency !== '' && rate !== 'N/A')
        .map(([currency, rate]) => ({ currency, rate }))
      return { date, rates }
    })
  }

  /**
   * Turns the ECB XML (nested <Cube> elements: one per day, one per currency)
   * into daily rate lists. Attribute values are kept as strings.
   */
  parseXmlRates(xml: string): EcbDailyRates[] {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: false,
      isArray: (_tagName, jPath) => jPath === DAY_PATH || jPath === RATE_PATH,
    })

    const envelope = parser.parse(xml) as Partial<XmlEnvelope>
    const days = envelope['gesmes:Envelope']?.Cube?.Cube
    if (!days) {
      throw new Error('ECB XML does not contain any <Cube time="..."> elements')
    }

    return days.map((day) => ({
      date: day.time,
      rates: (day.Cube ?? []).map(({ currency, rate }) => ({ currency, rate })),
    }))
  }

  private async fetchText(url: string): Promise<string> {
    const data = await this.download<string>(url, 'text')
    return data
  }

  private async fetchZippedCsv(url: string): Promise<string> {
    const data = await this.download<ArrayBuffer>(url, 'arraybuffer')

    const archive = await unzipper.Open.buffer(Buffer.from(data))
    const file = archive.files.find((entry) => entry.path.endsWith('.csv'))
    if (!file) {
      throw new Error(`No CSV file found in ECB archive ${url}`)
    }

    const csv = await file.buffer()
    return csv.toString('utf8')
  }

  private async download<T>(url: string, responseType: 'text' | 'arraybuffer'): Promise<T> {
    this.logger.debug({ url }, 'Downloading ECB rates')
    try {
      const response = await axios.get<T>(url, { responseType, timeout: REQUEST_TIMEOUT_MS })
      return response.data
    } catch (error) {
      throw new Error(`Failed to download ECB rates from ${url}`, { cause: error })
    }
  }
}
