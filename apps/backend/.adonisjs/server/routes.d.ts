import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'currencies.index': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'currencies.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'currencies.index': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}