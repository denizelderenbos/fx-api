import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { EcbClientService } from '#services/ecb_client_service'

const CSV = [
  'Date,USD,JPY,ROL,',
  '2024-01-03,1.0919,155.32,N/A,',
  '2024-01-02,1.0956,154.99,N/A,',
  '',
].join('\n')

test.group('EcbClientService.parseCsvRates', () => {
  test('yields one entry per day without N/A values or the trailing empty column', async ({
    assert,
  }) => {
    const service = await app.container.make(EcbClientService)

    const days = await Array.fromAsync(service.parseCsvRates(CSV))

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

    const [day] = await Array.fromAsync(service.parseCsvRates('Date,IDR,\n2024-01-03,20426.66,\n'))

    assert.strictEqual(day.rates[0].rate, '20426.66')
  })

  test('surfaces parse errors as exceptions', async ({ assert }) => {
    const service = await app.container.make(EcbClientService)

    await assert.rejects(() =>
      Array.fromAsync(service.parseCsvRates('Date,USD\n"2024-01-03,1.09\n'))
    )
  })
})

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <Cube>
    <Cube time='2026-09-23'>
      <Cube currency='USD' rate='1.1411'/>
      <Cube currency='JPY' rate='180.20'/>
    </Cube>
    <Cube time='2026-09-22'>
      <Cube currency='USD' rate='1.1463'/>
    </Cube>
  </Cube>
</gesmes:Envelope>`

test.group('EcbClientService.parseXmlRates', () => {
  test('yields one entry per day with rates as strings', async ({ assert }) => {
    const service = await app.container.make(EcbClientService)

    const days = service.parseXmlRates(XML)

    assert.deepEqual(days, [
      {
        date: '2026-09-23',
        rates: [
          { currency: 'USD', rate: '1.1411' },
          { currency: 'JPY', rate: '180.20' },
        ],
      },
      { date: '2026-09-22', rates: [{ currency: 'USD', rate: '1.1463' }] },
    ])
  })

  test('handles a feed with a single day and a single rate', async ({ assert }) => {
    const service = await app.container.make(EcbClientService)
    const single = XML.replace(/<Cube time='2026-09-22'>[\s\S]*?<\/Cube>\s*/, '').replace(
      "<Cube currency='JPY' rate='180.20'/>",
      ''
    )

    const days = service.parseXmlRates(single)

    assert.deepEqual(days, [{ date: '2026-09-23', rates: [{ currency: 'USD', rate: '1.1411' }] }])
  })

  test('rejects XML without rate cubes', async ({ assert }) => {
    const service = await app.container.make(EcbClientService)

    assert.throws(() => service.parseXmlRates('<gesmes:Envelope></gesmes:Envelope>'))
  })
})
