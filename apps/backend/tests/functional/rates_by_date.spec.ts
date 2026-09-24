import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Currency from '#models/currency'
import Rate from '#models/rate'

const ENDPOINT = '/api/v1/rates'
const ONE_YEAR = 'public, max-age=31536000'
const FIVE_MINUTES = 'public, max-age=300'

/**
 * Two trading days around a weekend, with different rates so the
 * fallback is observable. HRK only exists on the older day.
 */
async function seedRates() {
  await Currency.createMany([
    { code: 'EUR', name: 'Euro' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'HRK', name: 'Croatian kuna' },
  ])

  const friday = DateTime.fromISO('2024-01-12')
  const monday = DateTime.fromISO('2024-01-15')

  await Rate.createMany([
    { date: friday, currency: 'EUR', rate: '1' },
    { date: friday, currency: 'USD', rate: '1.2' },
    { date: friday, currency: 'GBP', rate: '0.8' },
    { date: friday, currency: 'HRK', rate: '7.5' },
    { date: monday, currency: 'EUR', rate: '1' },
    { date: monday, currency: 'USD', rate: '1.1' },
    { date: monday, currency: 'GBP', rate: '0.88' },
  ])
}

test.group('GET /api/v1/rates/:date', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('returns cross rates against the requested base for a trading day', async ({
    client,
    assert,
  }) => {
    await seedRates()

    const response = await client
      .get(`${ENDPOINT}/2024-01-15`)
      .qs({ base: 'USD', symbols: 'EUR,GBP' })

    response.assertStatus(200)
    assert.deepEqual(response.body(), {
      base: 'USD',
      date: '2024-01-15',
      rates: { EUR: '0.909091', GBP: '0.800000' },
    })
  })

  test('a weekend date falls back to the previous trading day, with EUR as default base', async ({
    client,
    assert,
  }) => {
    await seedRates()

    const response = await client.get(`${ENDPOINT}/2024-01-13`)

    response.assertStatus(200)
    assert.deepEqual(response.body(), {
      base: 'EUR',
      date: '2024-01-12',
      rates: { USD: '1.200000', GBP: '0.800000', HRK: '7.500000' },
    })
  })

  test('a single symbol filters to just that currency', async ({ client, assert }) => {
    await seedRates()

    const response = await client.get(`${ENDPOINT}/2024-01-15`).qs({ base: 'USD', symbols: 'GBP' })

    response.assertStatus(200)
    assert.deepEqual(response.body().rates, { GBP: '0.800000' })
  })

  test('a date on or before the latest synced day is cached for a year', async ({ client }) => {
    await seedRates()

    const response = await client.get(`${ENDPOINT}/2024-01-15`)

    response.assertStatus(200)
    response.assertHeader('cache-control', ONE_YEAR)
  })

  test('a date after the latest synced day serves the latest rates, cached briefly', async ({
    client,
    assert,
  }) => {
    await seedRates()

    const response = await client.get(`${ENDPOINT}/2999-01-01`)

    response.assertStatus(200)
    assert.equal(response.body().date, '2024-01-15')
    response.assertHeader('cache-control', FIVE_MINUTES)
  })

  test('returns 404 when the base has no rate on the effective day', async ({ client }) => {
    await seedRates()

    const response = await client.get(`${ENDPOINT}/2024-01-15`).qs({ base: 'HRK' })

    response.assertStatus(404)
    response.assertBodyContains({ message: 'No rates found for HRK on 2024-01-15' })
  })

  test('returns 404 for an unknown base', async ({ client }) => {
    await seedRates()

    const response = await client.get(`${ENDPOINT}/2024-01-15`).qs({ base: 'XYZ' })

    response.assertStatus(404)
  })

  test('returns 404 for a date before the first rate', async ({ client }) => {
    await seedRates()

    const response = await client.get(`${ENDPOINT}/1998-12-31`)

    response.assertStatus(404)
  })

  test('rejects an impossible date with 422', async ({ client }) => {
    await seedRates()

    const response = await client.get(`${ENDPOINT}/2024-02-30`)

    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'params.date' }] })
  })
})
