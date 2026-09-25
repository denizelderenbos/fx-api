import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { inject } from '@adonisjs/core'
import { FxSyncService } from '#services/fx_sync_service'

export default class FxBackfill extends BaseCommand {
  static commandName = 'fx:backfill'
  static description = 'Import the full ECB exchange rate history and refresh currency metadata'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Skip when the full history has already been imported once' })
  declare ifMissing: boolean

  @inject()
  async run(fxSync: FxSyncService) {
    if (this.ifMissing && (await fxSync.hasFullHistory())) {
      this.logger.info('Full ECB history already imported, skipping')
      return
    }

    this.logger.info('Syncing full ECB history')
    const result = await fxSync.sync('hist')

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
