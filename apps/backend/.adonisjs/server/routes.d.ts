import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'currencies.index': { paramsTuple?: []; params?: {} }
    'rates.latest_rates': { paramsTuple?: []; params?: {} }
    'rates.timeseries': { paramsTuple?: []; params?: {} }
    'rates.rates_by_date': { paramsTuple: [ParamValue]; params: {'date': ParamValue} }
    'rates.convert': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'currencies.index': { paramsTuple?: []; params?: {} }
    'rates.latest_rates': { paramsTuple?: []; params?: {} }
    'rates.timeseries': { paramsTuple?: []; params?: {} }
    'rates.rates_by_date': { paramsTuple: [ParamValue]; params: {'date': ParamValue} }
    'rates.convert': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'currencies.index': { paramsTuple?: []; params?: {} }
    'rates.latest_rates': { paramsTuple?: []; params?: {} }
    'rates.timeseries': { paramsTuple?: []; params?: {} }
    'rates.rates_by_date': { paramsTuple: [ParamValue]; params: {'date': ParamValue} }
    'rates.convert': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}