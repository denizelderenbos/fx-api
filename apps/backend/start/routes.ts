/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router.get('currencies', [controllers.Currencies, 'index'])
    // GET /api/v1/rates/latest?base=USD&symbols=EUR,GBP
    router.get('rates/latest', [controllers.Rates, 'latestRates'])

    // GET /api/v1/rates/timeseries?base=USD&symbols=EUR&from=2024-01-01&to=2024-03-31
    router.get('rates/timeseries', [controllers.Rates, 'timeseries'])

    // GET /api/v1/rates/2024-01-15?base=USD&symbols=EUR,GBP
    router.get('rates/:date', [controllers.Rates, 'ratesByDate'])

    // GET /api/v1/convert?from=USD&to=GBP&amount=100&date=2024-01-15
    router.get('convert', [controllers.Conversions, 'show'])

    // router
    //   .group(() => {
    //     router.post('signup', [controllers.NewAccount, 'store'])
    //     router.post('login', [controllers.AccessTokens, 'store'])
    //   })
    //   .prefix('auth')
    //   .as('auth')
    //
    // router
    //   .group(() => {
    //     router.get('profile', [controllers.Profile, 'show'])
    //     router.post('logout', [controllers.AccessTokens, 'destroy'])
    //   })
    //   .prefix('account')
    //   .as('profile')
    //   .use(middleware.auth())
  })
  .prefix('/api/v1')
