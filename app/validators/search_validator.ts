import vine from '@vinejs/vine'

export const searchBookValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(1023).optional(),
    subtitle: vine.string().trim().minLength(3).maxLength(1023).optional(),
    author: vine.string().trim().minLength(3).maxLength(1023).optional(),
    narrator: vine.string().trim().minLength(3).maxLength(1023).optional(),
    keywords: vine.string().trim().minLength(3).maxLength(1023).optional(),
    publisher: vine.string().trim().maxLength(1023).optional(),
    language: vine.string().trim().maxLength(255).optional(),
    releasedAfter: vine.date().optional(),
    releasedBefore: vine.date().optional(),
    publishedAfter: vine.date().optional(),
    publishedBefore: vine.date().optional(),
    isExplicit: vine.boolean().optional(),
    isAbridged: vine.boolean().optional(),
    type: vine.enum(['book', 'audiobook', 'podcast']).optional(),
    page: vine.number().withoutDecimals().min(1).optional(),
  })
)
