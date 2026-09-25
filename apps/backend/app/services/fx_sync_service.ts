import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import { DateTime } from 'luxon'
import SyncRun, { type SyncSource } from '#models/sync_run'
import { EcbClientService } from '#services/ecb_client_service'
import { RateImportService, type ImportResult } from '#services/rate_import_service'

/**
 * Runs a full ECB sync (download + import) and records the outcome
 * in sync_runs, whether it succeeds or fails.
 */
@inject()
export class FxSyncService {
  constructor(
    protected logger: Logger,
    protected ecbClient: EcbClientService,
    protected importer: RateImportService
  ) {}

  async sync(source: SyncSource): Promise<ImportResult> {
    const run = await SyncRun.create({ source, startedAt: DateTime.now() })

    try {
      const days = await this.fetch(source)
      const result = await this.importer.import(days)

      run.merge({
        status: 'ok',
        finishedAt: DateTime.now(),
        rowsUpserted: result.rates,
        latestDate: result.latestDate ? DateTime.fromISO(result.latestDate) : null,
      })
      await run.save()

      return result
    } catch (error) {
      run.merge({
        status: 'failed',
        finishedAt: DateTime.now(),
        error: describe(error),
      })
      await run.save()

      throw error
    }
  }

  /** True once a full history import has succeeded. */
  async hasFullHistory(): Promise<boolean> {
    const run = await SyncRun.query().where('source', 'hist').where('status', 'ok').first()
    return run !== null
  }

  /**
   * Brings the rates up to date: the full history when it was never imported
   * (a fresh install, or a backfill that failed), otherwise the last 90 days.
   * The history file includes the recent days, so one of the two is enough.
   */
  async catchUp(): Promise<{ source: SyncSource; result: ImportResult }> {
    const source: SyncSource = (await this.hasFullHistory()) ? '90d' : 'hist'
    if (source === 'hist') {
      this.logger.info('No complete ECB history yet, importing the full history first')
    }

    return { source, result: await this.sync(source) }
  }

  private fetch(source: SyncSource) {
    switch (source) {
      case 'hist':
        return this.ecbClient.getHistoricalRates()
      case '90d':
        return this.ecbClient.getRecentRates()
      case 'daily':
        return this.ecbClient.getDailyRates()
    }
  }
}

/** Message plus cause chain, so a wrapped download error still shows the original reason. */
function describe(error: unknown): string {
  const parts: string[] = []
  let current: unknown = error
  while (current instanceof Error) {
    parts.push(current.message)
    current = current.cause
  }
  return parts.length > 0 ? parts.join(' <- ') : String(error)
}
