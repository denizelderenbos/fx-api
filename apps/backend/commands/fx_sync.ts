import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { inject } from '@adonisjs/core'
import { FxSyncService } from '#services/fx_sync_service'

/**
 * Daily sync, run by system cron after 16:00 CET, when the ECB publishes
 * the reference rates for the day. Imports the last 90 ECB trading days,
 * or the full history when that was never imported, so a fresh install
 * fills itself on the first run.
 */
export default class FxSync extends BaseCommand {
  static commandName = 'fx:sync'
  static description =
    'Import the last 90 days of ECB exchange rates (the full history when missing) and refresh currency metadata'

  static options: CommandOptions = {
    startApp: true,
  }

  @inject()
  async run(fxSync: FxSyncService) {
    this.logger.info('Syncing ECB rates')
    const { source, result } = await fxSync.catchUp()

    if (result.unknownCurrencies.length > 0) {
      this.logger.warning(
        `Unknown currencies stored under their code: ${result.unknownCurrencies.join(', ')}`
      )
    }
    this.logger.success(
      `Imported ${result.rates} rates over ${result.days} days from ${source}, latest ${result.latestDate}`
    )
  }
}
