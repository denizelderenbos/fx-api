import { test } from '@japa/runner'
import { crossRate } from '#helpers/conversion_helper'
import Big from 'big.js'

test.group('crossRate', () => {
  test('with EUR as base the cross rate equals the quote rate', ({ assert }) => {
    const result = crossRate(Big(1), Big(1.0945))

    assert.equal(result.toString(), '1.0945')
  })

  test('divides the quote rate by the base rate', ({ assert }) => {
    // USD 1.0945 and CHF 0.9837 per EUR: 1 CHF = 1.0945 / 0.9837 USD
    const result = crossRate(Big(0.9837), Big(1.0945))

    assert.equal(result.toFixed(6), '1.112636')
  })

  test('base equal to quote gives exactly 1', ({ assert }) => {
    const result = crossRate(Big(1.0945), Big(1.0945))

    assert.equal(result.toString(), '1')
  })

  test('reversing base and quote gives the reciprocal', ({ assert }) => {
    const forward = crossRate(Big(0.9837), Big(1.0945))
    const backward = crossRate(Big(1.0945), Big(0.9837))

    assert.equal(forward.times(backward).toFixed(6), '1.000000')
  })

  test('keeps decimal precision where floats would not', ({ assert }) => {
    // 0.3 / 0.1 is 2.9999999999999996 in plain JavaScript
    const result = crossRate(Big(0.1), Big(0.3))

    assert.equal(result.toString(), '3')
  })
})
