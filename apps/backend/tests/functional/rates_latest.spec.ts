import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { MONDAY, seedRates } from '#tests/helpers/rates_seed'

const ENDPOINT = '/api/v1/rates/latest'
const FIVE_MINUTES = 'public, max-age=300'

test.group('GET /api/v1/rates/latest', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('serves the most recent day in the table, not today, with EUR as default base', async ({
    client,
    assert,
  }) => {
    await seedRates()

    const response = await client.get(ENDPOINT)

    response.assertStatus(200)
    assert.deepEqual(response.body(), {
      base: 'EUR',
      date: MONDAY,
      rates: { USD: '1.100000', GBP: '0.880000' },
    })
  })

  test('applies base and symbols like the dated endpoint', async ({ client, assert }) => {
    await seedRates()

    const response = await client.get(`${ENDPOINT}?base=USD&symbols=GBP`)

    response.assertStatus(200)
    assert.deepEqual(response.body(), {
      base: 'USD',
      date: MONDAY,
      rates: { GBP: '0.800000' },
    })
  })

  test('is never cached for long, because it changes every trading day', async ({ client }) => {
    await seedRates()

    const response = await client.get(ENDPOINT)

    response.assertStatus(200)
    response.assertHeader('cache-control', FIVE_MINUTES)
  })

  test('returns 404 for a base without a rate on the latest day', async ({ client }) => {
    await seedRates()

    const response = await client.get(`${ENDPOINT}?base=HRK`)

    response.assertStatus(404)
    response.assertBodyContains({ message: 'No rates found for HRK' })
  })

  test('returns 404 while nothing has been synced', async ({ client }) => {
    const response = await client.get(ENDPOINT)

    response.assertStatus(404)
  })
})
