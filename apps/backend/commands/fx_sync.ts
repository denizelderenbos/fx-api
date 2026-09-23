import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { inject } from '@adonisjs/core'
import { FxSyncService } from '#services/fx_sync_service'

/**
 * Daily sync: imports the last 90 ECB trading days. Run it after 16:00 CET,
 * when the ECB publishes the reference rates for the day.
 */
export default class FxSync extends BaseCommand {
  static commandName = 'fx:sync'
  static description = 'Import the last 90 days of ECB exchange rates and refresh currency metadata'

  static options: CommandOptions = {
    startApp: true,
  }

  @inject()
  async run(fxSync: FxSyncService) {
    this.logger.info('Syncing recent ECB rates')
    const result = await fxSync.sync('90d')

    if (result.unknownCurrencies.length > 0) {
      this.logger.warning(
        `Unknown currencies stored under their code: ${result.unknownCurrencies.join(', ')}`
      )
    }
    this.logger.success(
      `Imported ${result.rates} rates over ${result.days} days, latest ${result.latestDate}`
    )
  }
}
