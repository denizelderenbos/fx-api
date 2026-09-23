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
}
