import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Book from '#models/book'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Track extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare start: number

  @column()
  declare end: number

  @column()
  declare bookId: number

  @belongsTo(() => Book)
  declare book: BelongsTo<typeof Book>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
