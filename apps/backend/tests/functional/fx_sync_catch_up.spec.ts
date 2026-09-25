import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import SyncRun, { type SyncSource } from '#models/sync_run'
import { EcbClientService, type EcbDailyRates } from '#services/ecb_client_service'
import { FxSyncService } from '#services/fx_sync_service'

const DAYS: EcbDailyRates[] = [{ date: '2024-01-12', rates: [{ currency: 'USD', rate: '1.1' }] }]

/** Stands in for the ECB, recording which file was requested. */
class FakeEcbClient {
  requested: SyncSource[] = []
  failHistory = false

  async getHistoricalRates() {
    this.requested.push('hist')
    if (this.failHistory) throw new Error('ECB unreachable')
    return DAYS
  }

  async getRecentRates() {
    this.requested.push('90d')
    return DAYS
  }
}

test.group('FxSyncService.catchUp', (group) => {
  let ecb: FakeEcbClient

  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    ecb = new FakeEcbClient()
    app.container.swap(EcbClientService, () => ecb as unknown as EcbClientService)
    return () => app.container.restore(EcbClientService)
  })

  test('a fresh install imports the full history', async ({ assert }) => {
    const fxSync = await app.container.make(FxSyncService)

    const { source } = await fxSync.catchUp()

    assert.equal(source, 'hist')
    assert.deepEqual(ecb.requested, ['hist'])
    assert.isTrue(await fxSync.hasFullHistory())
  })

  test('once the history is in, only the last 90 days are synced', async ({ assert }) => {
    const fxSync = await app.container.make(FxSyncService)
    await fxSync.catchUp()

    const { source } = await fxSync.catchUp()

    assert.equal(source, '90d')
    assert.deepEqual(ecb.requested, ['hist', '90d'])
  })

  test('a failed history import is retried on the next run', async ({ assert }) => {
    const fxSync = await app.container.make(FxSyncService)
    ecb.failHistory = true

    await assert.rejects(() => fxSync.catchUp(), 'ECB unreachable')
    assert.isFalse(await fxSync.hasFullHistory())

    ecb.failHistory = false
    const { source } = await fxSync.catchUp()

    assert.equal(source, 'hist')
    assert.isTrue(await fxSync.hasFullHistory())
  })

  test('90-day syncs alone do not count as a full history', async ({ assert }) => {
    await SyncRun.create({ source: '90d', status: 'ok', startedAt: DateTime.now() })
    const fxSync = await app.container.make(FxSyncService)

    const { source } = await fxSync.catchUp()

    assert.equal(source, 'hist')
  })
})
