import { DateTime } from 'luxon'
import {
  afterCreate,
  afterDelete,
  afterFind,
  afterUpdate,
  BaseModel,
  beforeCreate,
  belongsTo,
  column,
  hasMany,
  manyToMany,
} from '@adonisjs/lucid/orm'
import Author from '#models/author'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Narrator from '#models/narrator'
import Genre from '#models/genre'
import Identifier from '#models/identifier'
import Series from '#models/series'
import Track from '#models/track'
import BookGroup from '#models/book_group'
import { nanoid } from '#config/app'
import { bookIndex } from '#config/meilisearch'
import { SearchEngineHelper } from '../helpers/search_engine.js'

export default class Book extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column({ serializeAs: 'id' })
  declare publicId: string

  @column()
  declare title: string

  @column()
  declare subtitle: string | null

  @column()
  declare summary: string | null

  @column()
  declare description: string | null

  @column()
  declare publisher: string | null

  @column()
  declare image: string | null

  @column()
  declare language: string | null

  @column()
  declare copyright: string | null

  @column()
  declare page: number | null

  @column()
  declare duration: number | null

  @column.dateTime()
  declare releasedAt: DateTime | null

  @column()
  declare isExplicit: boolean

  @column()
  declare isAbridged: boolean | null

  @column()
  declare groupId: number | null

  @column()
  declare enabled: boolean

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @column()
  // @enum(book, audiobook, podcast)
  declare type: 'book' | 'audiobook' | 'podcast' | 'e-book'

  @manyToMany(() => Author, {
    pivotTable: 'book_author',
  })
  declare authors: ManyToMany<typeof Author>

  @manyToMany(() => Narrator, {
    pivotColumns: ['role'],
  })
  declare narrators: ManyToMany<typeof Narrator>

  @manyToMany(() => Genre)
  declare genres: ManyToMany<typeof Genre>

  @manyToMany(() => Identifier)
  declare identifiers: ManyToMany<typeof Identifier>

  @manyToMany(() => Series, {
    pivotColumns: ['position'],
  })
  declare series: ManyToMany<typeof Series>

  @hasMany(() => Track, {
    foreignKey: 'bookId',
  })
  declare tracks: HasMany<typeof Track>

  @belongsTo(() => BookGroup, {
    foreignKey: 'groupId',
    localKey: 'id',
  })
  declare group: BelongsTo<typeof BookGroup>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @afterFind()
  public static async afterFindHook(book: Book) {
    if (book.narrators) {
      for (let i = 0; i < book.narrators.length; i++) {
        const narrator = book.narrators[i]
        if (narrator.$extras.pivot_role) {
          book.narrators[i].role = narrator.$extras.pivot_role
        }
      }
    }
    if (book.series) {
      for (let i = 0; i < book.series.length; i++) {
        const series = book.series[i]
        if (series.$extras.pivot_position) {
          book.series[i].position = series.$extras.pivot_position
        }
      }
    }
  }

  @beforeCreate()
  public static ensurePublicId(book: Book) {
    if (!book.publicId) {
      book.publicId = nanoid()
    }
  }

  @afterCreate()
  public static async afterCreateHook(book: Book) {
    Book.query()
      .where('id', book.id)
      .preload('authors')
      .preload('narrators')
      .preload('genres')
      .preload('series')
      .first()
      .then((fetchedBook) => {
        if (!fetchedBook) {
          return
        }
        void bookIndex.addDocuments([
          {
            id: fetchedBook.id,
            title: fetchedBook.title,
            subtitle: fetchedBook.subtitle,
            description: SearchEngineHelper.removeHtmlTags(fetchedBook.description),
            type: fetchedBook.type,
            authors: fetchedBook.authors.map((author) => author.name),
            narrators: fetchedBook.narrators.map((narrator) => narrator.name),
            genres: fetchedBook.genres.map((genre) => genre.name),
            language: fetchedBook.language
              ? {
                  language: fetchedBook.language.split('-')[0],
                  code: fetchedBook.language.split('-')[1],
                }
              : null,
            series:
              fetchedBook.series.length > 0
                ? fetchedBook.series.map((serie) => {
                    return {
                      name: serie.name,
                      position: serie.position,
                    }
                  })
                : null,
          },
        ])
      })
  }

  @afterUpdate()
  public static async afterUpdateHook(book: Book) {
    Book.query()
      .where('id', book.id)
      .preload('authors')
      .preload('narrators')
      .preload('genres')
      .preload('series')
      .first()
      .then((fetchedBook) => {
        if (!fetchedBook) {
          return
        }
        void bookIndex.updateDocuments([
          {
            id: fetchedBook.id,
            title: fetchedBook.title,
            subtitle: fetchedBook.subtitle,
            description: SearchEngineHelper.removeHtmlTags(fetchedBook.description),
            type: fetchedBook.type,
            authors: fetchedBook.authors.map((author) => author.name),
            narrators: fetchedBook.narrators.map((narrator) => narrator.name),
            genres: fetchedBook.genres.map((genre) => genre.name),
            language: fetchedBook.language
              ? {
                  language: fetchedBook.language.split('-')[0],
                  code: fetchedBook.language.split('-')[1],
                }
              : null,
            series:
              fetchedBook.series.length > 0
                ? fetchedBook.series.map((serie) => {
                    return {
                      name: serie.name,
                      position: serie.position,
                    }
                  })
                : null,
          },
        ])
      })
  }

  @afterDelete()
  public static async afterDeleteHook(book: Book) {
    void bookIndex.deleteDocument(book.id)
  }
}
