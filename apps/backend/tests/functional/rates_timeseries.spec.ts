import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { FRIDAY, MONDAY, seedRates, seedToday } from '#tests/helpers/rates_seed'

const ENDPOINT = '/api/v1/rates/timeseries'
const ONE_YEAR = 'public, max-age=31536000'
const FIVE_MINUTES = 'public, max-age=300'

/** Raw query strings, exactly as a client would send them. */
const url = (query: Record<string, string>): `${typeof ENDPOINT}?${string}` =>
  `${ENDPOINT}?${new URLSearchParams(query)}`

test.group('GET /api/v1/rates/timeseries', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('returns cross rates per trading day, each against that day’s base rate', async ({
    client,
    assert,
  }) => {
    await seedRates()

    const response = await client.get(
      url({ base: 'USD', symbols: 'EUR,GBP', from: FRIDAY, to: MONDAY })
    )

    response.assertStatus(200)
    assert.deepEqual(response.body(), {
      base: 'USD',
      start_date: FRIDAY,
      end_date: MONDAY,
      rates: {
        [FRIDAY]: { EUR: '0.833333', GBP: '0.666667' },
        [MONDAY]: { EUR: '0.909091', GBP: '0.800000' },
      },
    })
  })

  test('defaults to EUR as base and all currencies, leaving out missing ones per day', async ({
    client,
    assert,
  }) => {
    await seedRates()

    const response = await client.get(url({ from: FRIDAY, to: MONDAY }))

    response.assertStatus(200)
    assert.deepEqual(response.body().rates, {
      [FRIDAY]: { GBP: '0.800000', HRK: '7.500000', USD: '1.200000' },
      [MONDAY]: { GBP: '0.880000', USD: '1.100000' },
    })
  })

  test('start_date and end_date are the trading days actually in the series', async ({
    client,
    assert,
  }) => {
    await seedRates()

    const response = await client.get(url({ from: '2024-01-13', to: '2024-01-20' }))

    response.assertStatus(200)
    assert.equal(response.body().start_date, MONDAY)
    assert.equal(response.body().end_date, MONDAY)
    assert.deepEqual(Object.keys(response.body().rates), [MONDAY])
  })

  test('drops days on which the base has no rate', async ({ client, assert }) => {
    await seedRates()

    const response = await client.get(url({ base: 'HRK', from: FRIDAY, to: MONDAY }))

    response.assertStatus(200)
    assert.deepEqual(Object.keys(response.body().rates), [FRIDAY])
  })

  test('a series ending on or before the latest synced day is cached for a year', async ({
    client,
  }) => {
    await seedRates()

    const response = await client.get(url({ from: FRIDAY, to: MONDAY }))

    response.assertStatus(200)
    response.assertHeader('cache-control', ONE_YEAR)
  })

  test('a series ending in the future serves what exists, cached briefly', async ({
    client,
    assert,
  }) => {
    await seedRates()

    const response = await client.get(url({ from: FRIDAY, to: '2024-06-30' }))

    response.assertStatus(200)
    assert.equal(response.body().end_date, MONDAY)
    response.assertHeader('cache-control', FIVE_MINUTES)
  })

  test('without to, the series runs up to the latest synced day', async ({ client, assert }) => {
    await seedRates()

    const response = await client.get(url({ symbols: 'USD', from: '2024-01-01' }))

    response.assertStatus(200)
    assert.equal(response.body().end_date, MONDAY)
    response.assertHeader('cache-control', FIVE_MINUTES)
  })

  test('without to it stays cached briefly, even once today is synced', async ({ client }) => {
    await seedRates()
    await seedToday()

    const response = await client.get(url({ symbols: 'USD', from: '2024-01-01' }))

    response.assertStatus(200)
    response.assertHeader('cache-control', FIVE_MINUTES)
  })

  test('rejects from after to with 422', async ({ client }) => {
    await seedRates()

    const response = await client.get(url({ from: MONDAY, to: FRIDAY }))

    response.assertStatus(422)
  })

  test('rejects a range longer than five years with 422, even by a day', async ({ client }) => {
    await seedRates()

    const response = await client.get(url({ symbols: 'USD', from: '2019-01-15', to: '2024-01-16' }))

    response.assertStatus(422)
  })

  test('accepts exactly five years with symbols', async ({ client }) => {
    await seedRates()

    const response = await client.get(url({ symbols: 'USD', from: '2019-01-15', to: MONDAY }))

    response.assertStatus(200)
  })

  test('requires symbols for a range longer than one year', async ({ client }) => {
    await seedRates()

    const response = await client.get(url({ from: '2023-01-12', to: MONDAY }))

    response.assertStatus(422)
    response.assertBodyContains({
      message: 'symbols is required for a timeseries longer than 1 year',
    })
  })

  test('rejects a missing or impossible from with 422', async ({ client }) => {
    await seedRates()

    const missing = await client.get(ENDPOINT)
    missing.assertStatus(422)

    const impossible = await client.get(url({ from: '2024-02-30' }))
    impossible.assertStatus(422)
  })

  test('returns 404 for a range without any trading day', async ({ client }) => {
    await seedRates()

    const response = await client.get(url({ from: '1998-01-01', to: '1998-12-31' }))

    response.assertStatus(404)
  })

  test('returns 404 while nothing has been synced', async ({ client }) => {
    const response = await client.get(url({ from: FRIDAY, to: MONDAY }))

    response.assertStatus(404)
  })
})
