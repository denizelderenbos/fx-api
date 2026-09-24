import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { inject } from '@adonisjs/core'
import { EcbClientService } from '#services/ecb_client_service'
import { RateImportService } from '#services/rate_import_service'

export default class FxBackfill extends BaseCommand {
  static commandName = 'fx:backfill'
  static description = 'Import the full ECB exchange rate history and refresh currency metadata'

  static options: CommandOptions = {
    startApp: true,
  }

  @inject()
  async run(ecbClient: EcbClientService, importer: RateImportService) {
    this.logger.info('Downloading ECB history')
    const days = await ecbClient.getHistoricalRates()

    this.logger.info('Importing rates')
    const result = await importer.import(days)

    if (result.unknownCurrencies.length > 0) {
      this.logger.warning(
        `Unknown currencies stored under their code: ${result.unknownCurrencies.join(', ')}`
      )
    }
    this.logger.success(`Imported ${result.rates} rates over ${result.days} days`)
  }
}
