/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'currencies.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/currencies'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/currency').getCurrenciesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/currencies_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/currencies_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'rates.latest_rates': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/rates/latest'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/rate').latestRatesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rates_controller').default['latestRates']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rates_controller').default['latestRates']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'rates.timeseries': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/rates/timeseries'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/rate').timeseriesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rates_controller').default['timeseries']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rates_controller').default['timeseries']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'rates.rates_by_date': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/rates/:date'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { date: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/rate').ratesByDateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/rates_controller').default['ratesByDate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/rates_controller').default['ratesByDate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
}
