import vine from '@vinejs/vine'

export const getCurrenciesValidator = vine.create({
  is_active: vine.boolean().optional(),
})
