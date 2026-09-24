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
    // router.get('rates/latest', [controllers.Rates, 'latest'])

    // GET /api/v1/rates/2024-01-15?base=USD&symbols=EUR,GBP
    router.get('rates/:date', [controllers.Rates, 'ratesByDate'])

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
