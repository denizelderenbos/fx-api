import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Currency from '#models/currency'

const ENDPOINT = '/api/v1/currencies'

/** One active, one retired, one that never had a rate. */
async function seedCurrencies() {
  await Currency.createMany([
    {
      code: 'EUR',
      name: 'Euro',
      isActive: true,
      firstDate: DateTime.fromISO('1999-01-04'),
      lastDate: DateTime.fromISO('2026-09-23'),
    },
    {
      code: 'HRK',
      name: 'Croatian kuna',
      isActive: false,
      firstDate: DateTime.fromISO('2005-04-01'),
      lastDate: DateTime.fromISO('2022-12-30'),
    },
    { code: 'XXX', name: 'No universal currency', isActive: false },
  ])
}

const EUR = {
  code: 'EUR',
  name: 'Euro',
  is_active: true,
  first_date: '1999-01-04',
  last_date: '2026-09-23',
}

const HRK = {
  code: 'HRK',
  name: 'Croatian kuna',
  is_active: false,
  first_date: '2005-04-01',
  last_date: '2022-12-30',
}

test.group('GET /api/v1/currencies', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('returns 503 while nothing has been synced', async ({ client }) => {
    const response = await client.get(ENDPOINT)

    response.assertStatus(503)
    response.assertBodyContains({ message: 'No syncs yet' })
  })

  test('lists currencies that have rates, sorted by code, in the public shape', async ({
    client,
    assert,
  }) => {
    await seedCurrencies()

    const response = await client.get(ENDPOINT)

    response.assertStatus(200)
    assert.deepEqual(response.body(), { data: [EUR, HRK] })
    response.assertHeader('cache-control', 'public, max-age=300')
  })

  test('is_active=true returns only active currencies', async ({ client, assert }) => {
    await seedCurrencies()

    const response = await client.get(ENDPOINT).qs({ is_active: true })

    response.assertStatus(200)
    assert.deepEqual(response.body(), { data: [EUR] })
  })

  test('is_active=false returns only retired currencies', async ({ client, assert }) => {
    await seedCurrencies()

    const response = await client.get(ENDPOINT).qs({ is_active: false })

    response.assertStatus(200)
    assert.deepEqual(response.body(), { data: [HRK] })
  })

  test('a filtered request with no matches is an empty list, not a 503', async ({
    client,
    assert,
  }) => {
    await Currency.create({
      code: 'EUR',
      name: 'Euro',
      isActive: true,
      firstDate: DateTime.fromISO('1999-01-04'),
      lastDate: DateTime.fromISO('2026-09-23'),
    })

    const response = await client.get(ENDPOINT).qs({ is_active: false })

    response.assertStatus(200)
    assert.deepEqual(response.body(), { data: [] })
  })

  test('rejects a non-boolean is_active with 422', async ({ client }) => {
    await seedCurrencies()

    const response = await client.get(ENDPOINT).qs({ is_active: 'maybe' })

    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'is_active' }] })
  })
})
