/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'currencies.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/currencies',
    tokens: [{"old":"/api/v1/currencies","type":0,"val":"api","end":""},{"old":"/api/v1/currencies","type":0,"val":"v1","end":""},{"old":"/api/v1/currencies","type":0,"val":"currencies","end":""}],
    types: placeholder as Registry['currencies.index']['types'],
  },
  'rates.rates_by_date': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/rates/:date',
    tokens: [{"old":"/api/v1/rates/:date","type":0,"val":"api","end":""},{"old":"/api/v1/rates/:date","type":0,"val":"v1","end":""},{"old":"/api/v1/rates/:date","type":0,"val":"rates","end":""},{"old":"/api/v1/rates/:date","type":1,"val":"date","end":""}],
    types: placeholder as Registry['rates.rates_by_date']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
