/*
|--------------------------------------------------------------------------
| Define HTTP limiters
|--------------------------------------------------------------------------
|
| The "limiter.define" method creates an HTTP middleware to apply rate
| limits on a route or a group of routes. Feel free to define as many
| throttle middleware as needed.
|
*/

import limiter from '@adonisjs/limiter/services/main'

export const cheapThrottle = limiter.define('cheap', () => {
  return limiter.allowRequests(60).every('1 minute')
})
export const expensiveThrottle = limiter.define('expensive', () => {
  return limiter.allowRequests(10).every('1 minute')
})
