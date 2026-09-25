import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { FRIDAY, MONDAY, seedRates, seedToday } from '#tests/helpers/rates_seed'

const ENDPOINT = '/api/v1/convert'
const ONE_YEAR = 'public, max-age=31536000'
const FIVE_MINUTES = 'public, max-age=300'

/** Raw query strings, exactly as a client would send them. */
const url = (query: Record<string, string>): `${typeof ENDPOINT}?${string}` =>
  `${ENDPOINT}?${new URLSearchParams(query)}`

test.group('GET /api/v1/convert', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('converts an amount with the cross rate of the requested day', async ({
    client,
    assert,
  }) => {
    await seedRates()

    const response = await client.get(url({ from: 'USD', to: 'GBP', amount: '100', date: MONDAY }))

    response.assertStatus(200)
    assert.deepEqual(response.body(), {
      from: 'USD',
      to: 'GBP',
      date: MONDAY,
      amount: '100',
      rate: '0.800000',
      result: '80.000000',
    })
  })

  test('a weekend date uses the previous trading day', async ({ client, assert }) => {
    await seedRates()

    const response = await client.get(
      url({ from: 'USD', to: 'GBP', amount: '100', date: '2024-01-13' })
    )

    response.assertStatus(200)
    assert.equal(response.body().date, FRIDAY)
    assert.equal(response.body().rate, '0.666667')
    assert.equal(response.body().result, '66.666667')
  })

  test('works with EUR on either side, in any case, and with decimal amounts', async ({
    client,
    assert,
  }) => {
    await seedRates()

    const fromEur = await client.get(url({ from: 'eur', to: 'usd', amount: '2.5', date: FRIDAY }))
    fromEur.assertStatus(200)
    assert.equal(fromEur.body().result, '3.000000')

    const toEur = await client.get(url({ from: 'USD', to: 'EUR', amount: '0.1', date: MONDAY }))
    toEur.assertStatus(200)
    assert.equal(toEur.body().rate, '0.909091')
    assert.equal(toEur.body().result, '0.090909')
  })

  test('converting a currency to itself is 1:1', async ({ client, assert }) => {
    await seedRates()

    const response = await client.get(url({ from: 'USD', to: 'USD', amount: '42', date: MONDAY }))

    response.assertStatus(200)
    assert.equal(response.body().rate, '1.000000')
    assert.equal(response.body().result, '42.000000')
  })

  test('a date on or before the latest synced day is cached for a year', async ({ client }) => {
    await seedRates()

    const response = await client.get(url({ from: 'USD', to: 'GBP', amount: '1', date: MONDAY }))

    response.assertStatus(200)
    response.assertHeader('cache-control', ONE_YEAR)
  })

  test('a future date uses the latest rates, cached briefly', async ({ client, assert }) => {
    await seedRates()

    const response = await client.get(
      url({ from: 'USD', to: 'GBP', amount: '1', date: '2999-01-01' })
    )

    response.assertStatus(200)
    assert.equal(response.body().date, MONDAY)
    response.assertHeader('cache-control', FIVE_MINUTES)
  })

  test('without a date it uses the latest synced day, cached briefly', async ({
    client,
    assert,
  }) => {
    await seedRates()

    const response = await client.get(url({ from: 'USD', to: 'GBP', amount: '1' }))

    response.assertStatus(200)
    assert.equal(response.body().date, MONDAY)
    response.assertHeader('cache-control', FIVE_MINUTES)
  })

  test('without a date it stays cached briefly, even once today is synced', async ({ client }) => {
    await seedRates()
    await seedToday()

    const response = await client.get(url({ from: 'USD', to: 'GBP', amount: '1' }))

    response.assertStatus(200)
    response.assertHeader('cache-control', FIVE_MINUTES)
  })

  test('returns 404 when a currency has no rate on that day', async ({ client }) => {
    await seedRates()

    const response = await client.get(url({ from: 'USD', to: 'HRK', amount: '1', date: MONDAY }))

    response.assertStatus(404)
    response.assertBodyContains({ message: `No rate found from USD to HRK on ${MONDAY}` })
  })

  test('returns 404 for an unknown currency', async ({ client }) => {
    await seedRates()

    const response = await client.get(url({ from: 'XYZ', to: 'USD', amount: '1', date: MONDAY }))

    response.assertStatus(404)
  })

  test('returns 404 for a date before the first rate', async ({ client }) => {
    await seedRates()

    const response = await client.get(
      url({ from: 'USD', to: 'GBP', amount: '1', date: '1998-12-31' })
    )

    response.assertStatus(404)
  })

  test('returns 404 while nothing has been synced', async ({ client }) => {
    const response = await client.get(url({ from: 'USD', to: 'GBP', amount: '1' }))

    response.assertStatus(404)
  })

  test('rejects a missing, zero, negative or non-numeric amount with 422', async ({ client }) => {
    await seedRates()

    for (const amount of [undefined, '0', '-5', 'ten']) {
      const query: Record<string, string> = { from: 'USD', to: 'GBP' }
      if (amount !== undefined) query.amount = amount

      const response = await client.get(url(query))
      response.assertStatus(422)
      response.assertBodyContains({ errors: [{ field: 'amount' }] })
    }
  })

  test('rejects a malformed currency code or date with 422', async ({ client }) => {
    await seedRates()

    const badCode = await client.get(url({ from: 'US', to: 'GBP', amount: '1' }))
    badCode.assertStatus(422)
    badCode.assertBodyContains({ errors: [{ field: 'from' }] })

    const badDate = await client.get(
      url({ from: 'USD', to: 'GBP', amount: '1', date: '2024-02-30' })
    )
    badDate.assertStatus(422)
    badDate.assertBodyContains({ errors: [{ field: 'date' }] })
  })
})
