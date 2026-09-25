import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { FRIDAY, MONDAY, seedRates } from '#tests/helpers/rates_seed'

/** Most endpoints look up a single day. */
const CHEAP_LIMIT = 60
/** A timeseries can return years of rates in one request. */
const EXPENSIVE_LIMIT = 10

const LATEST = '/api/v1/rates/latest'
const BY_DATE = `/api/v1/rates/${MONDAY}` as const
const TIMESERIES = `/api/v1/rates/timeseries?from=${FRIDAY}&to=${MONDAY}` as const

test.group('Rate limiting', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => seedRates())

  test('counts down the remaining requests in the headers', async ({ client }) => {
    const first = await client.get(LATEST)
    const second = await client.get(LATEST)

    first.assertHeader('x-ratelimit-limit', String(CHEAP_LIMIT))
    first.assertHeader('x-ratelimit-remaining', String(CHEAP_LIMIT - 1))
    second.assertHeader('x-ratelimit-remaining', String(CHEAP_LIMIT - 2))
  })

  test('a cheap endpoint allows 60 requests a minute, then answers 429', async ({
    client,
    assert,
  }) => {
    for (let i = 0; i < CHEAP_LIMIT; i++) {
      const response = await client.get(LATEST)
      response.assertStatus(200)
    }

    const blocked = await client.get(LATEST)

    blocked.assertStatus(429)
    blocked.assertHeader('x-ratelimit-remaining', '0')
    assert.isAbove(Number(blocked.header('retry-after')), 0)
    assert.notInclude(blocked.header('cache-control') ?? '', 'public')
  })

  test('the timeseries allows 10 requests a minute, then answers 429', async ({ client }) => {
    for (let i = 0; i < EXPENSIVE_LIMIT; i++) {
      const response = await client.get(TIMESERIES)
      response.assertStatus(200)
      response.assertHeader('x-ratelimit-limit', String(EXPENSIVE_LIMIT))
    }

    const blocked = await client.get(TIMESERIES)

    blocked.assertStatus(429)
  })

  test('rates on a single date fall under the cheap limit', async ({ client }) => {
    for (let i = 0; i < EXPENSIVE_LIMIT; i++) {
      await client.get(BY_DATE)
    }

    const response = await client.get(BY_DATE)

    response.assertStatus(200)
    response.assertHeader('x-ratelimit-limit', String(CHEAP_LIMIT))
  })

  test('hitting the timeseries limit leaves the cheap endpoints alone', async ({ client }) => {
    for (let i = 0; i <= EXPENSIVE_LIMIT; i++) {
      await client.get(TIMESERIES)
    }

    const response = await client.get(LATEST)

    response.assertStatus(200)
    response.assertHeader('x-ratelimit-remaining', String(CHEAP_LIMIT - 1))
  })

  test('behind a trusted proxy, each forwarded client gets its own counter', async ({ client }) => {
    // Tests connect over loopback, which TRUSTED_PROXIES trusts by default.
    const first = await client.get(LATEST).header('X-Forwarded-For', '203.0.113.7')
    const again = await client.get(LATEST).header('X-Forwarded-For', '203.0.113.7')
    const other = await client.get(LATEST).header('X-Forwarded-For', '198.51.100.9')

    first.assertHeader('x-ratelimit-remaining', String(CHEAP_LIMIT - 1))
    again.assertHeader('x-ratelimit-remaining', String(CHEAP_LIMIT - 2))
    other.assertHeader('x-ratelimit-remaining', String(CHEAP_LIMIT - 1))
  })
})
