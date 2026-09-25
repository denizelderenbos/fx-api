import { DateTime } from 'luxon'
import Currency from '#models/currency'
import Rate from '#models/rate'

export const FRIDAY = '2024-01-12'
export const MONDAY = '2024-01-15'

/**
 * Two trading days around a weekend, with different rates so a fallback
 * to the earlier day is observable. HRK only exists on the older day.
 */
export async function seedRates() {
  await Currency.createMany([
    { code: 'EUR', name: 'Euro' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'HRK', name: 'Croatian kuna' },
  ])

  const friday = DateTime.fromISO(FRIDAY)
  const monday = DateTime.fromISO(MONDAY)

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

/**
 * A synced day dated today, for behaviour that depends on "latest" being
 * today, such as never caching an answer without an explicit date for long.
 */
export async function seedToday() {
  const today = DateTime.now().startOf('day')

  await Rate.createMany([
    { date: today, currency: 'EUR', rate: '1' },
    { date: today, currency: 'USD', rate: '1.3' },
    { date: today, currency: 'GBP', rate: '0.9' },
  ])
}
