import { test } from '@japa/runner'
import { errors } from '@vinejs/vine'
import { latestRatesValidator, ratesByDateValidator } from '#validators/rate'

test.group('latestRatesValidator', () => {
  test('defaults base to EUR and symbols to an empty array', async ({ assert }) => {
    const output = await latestRatesValidator.validate({})

    assert.deepEqual(output, { base: 'EUR', symbols: [] })
  })

  test('an explicitly empty symbols value is rejected, not treated as the default', async ({
    assert,
  }) => {
    await assert.rejects(
      () => latestRatesValidator.validate({ symbols: '' }),
      errors.E_VALIDATION_ERROR
    )
  })

  test('normalises codes to upper case and splits symbols on commas', async ({ assert }) => {
    const output = await latestRatesValidator.validate({ base: ' usd', symbols: 'eur, gbp' })

    assert.deepEqual(output, { base: 'USD', symbols: ['EUR', 'GBP'] })
  })

  test('rejects a base that is not a three-letter code', async ({ assert }) => {
    await assert.rejects(
      () => latestRatesValidator.validate({ base: 'US' }),
      errors.E_VALIDATION_ERROR
    )
  })

  test('rejects an empty base instead of falling back to the default', async ({ assert }) => {
    await assert.rejects(
      () => latestRatesValidator.validate({ base: '' }),
      errors.E_VALIDATION_ERROR
    )
  })

  test('rejects malformed and duplicate symbols', async ({ assert }) => {
    await assert.rejects(
      () => latestRatesValidator.validate({ symbols: 'EUR,GBPX' }),
      errors.E_VALIDATION_ERROR
    )
    await assert.rejects(
      () => latestRatesValidator.validate({ symbols: 'EUR,EUR' }),
      errors.E_VALIDATION_ERROR
    )
  })
})

test.group('ratesByDateValidator', () => {
  test('hands the route date on as an ISO string', async ({ assert }) => {
    const output = await ratesByDateValidator.validate({ params: { date: '2024-01-15' } })

    assert.deepEqual(output, { base: 'EUR', symbols: [], params: { date: '2024-01-15' } })
  })

  test('rejects impossible dates and other formats', async ({ assert }) => {
    for (const date of ['2024-02-30', '15-01-2024', 'hallo']) {
      await assert.rejects(
        () => ratesByDateValidator.validate({ params: { date } }),
        errors.E_VALIDATION_ERROR
      )
    }
  })
})
