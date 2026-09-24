import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { EcbClientService } from '#services/ecb_client_service'

const CSV = [
  'Date,USD,JPY,ROL,',
  '2024-01-03,1.0919,155.32,N/A,',
  '2024-01-02,1.0956,154.99,N/A,',
  '',
].join('\n')

test.group('EcbClientService.parseRates', () => {
  test('yields one entry per day without N/A values or the trailing empty column', async ({
    assert,
  }) => {
    const service = await app.container.make(EcbClientService)

    const days = await Array.fromAsync(service.parseRates(CSV))

    assert.lengthOf(days, 2)
    assert.deepEqual(days[0], {
      date: '2024-01-03',
      rates: [
        { currency: 'USD', rate: '1.0919' },
        { currency: 'JPY', rate: '155.32' },
      ],
    })
    assert.equal(days[1].date, '2024-01-02')
  })

  test('keeps rates as strings so no precision is lost', async ({ assert }) => {
    const service = await app.container.make(EcbClientService)

    const [day] = await Array.fromAsync(service.parseRates('Date,IDR,\n2024-01-03,20426.66,\n'))

    assert.strictEqual(day.rates[0].rate, '20426.66')
  })

  test('surfaces parse errors as exceptions', async ({ assert }) => {
    const service = await app.container.make(EcbClientService)

    await assert.rejects(() => Array.fromAsync(service.parseRates('Date,USD\n"2024-01-03,1.09\n')))
  })
})
