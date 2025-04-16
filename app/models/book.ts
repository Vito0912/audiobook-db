import { DateTime } from 'luxon'
import {
  afterCreate,
  afterDelete,
  afterUpdate,
  belongsTo,
  column,
  hasMany,
  manyToMany,
} from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Contributor from '#models/contributor'
import Genre from '#models/genre'
import Identifier from '#models/identifier'
import Series from '#models/series'
import Track from '#models/track'
import BookGroup from '#models/book_group'
import { bookIndex } from '#config/meilisearch'
import { SearchEngineHelper } from '../helpers/search_engine.js'
import Publisher from '#models/publisher'
import { LogExtension } from '../extensions/log_extension.js'

export default class Book extends LogExtension {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column()
  // @example(Harry Potter and the Philosopher's Stone)
  declare title: string

  @column()
  // @example(Harry Potter 1)
  declare subtitle: string | null

  @column()
  // @example(Short summary of the book)
  declare summary: string | null

  @column()
  // @example(Longer more detailed description of the book)
  declare description: string | null

  @column()
  // @example(https://example.com/image.jpg)
  declare image: string | null

  @column()
  // @example(English)
  declare language: string | null

  @column()
  // @example(©1997 J.K. Rowling (P)2011 Der Hörverlag in der Verlagsgruppe Random House GmbH)
  declare copyright: string | null

  @column()
  // @example(123)
  declare pages: number | null

  @column()
  // @props({"description": "The duration of the book (in seconds) if type is audiobook or podcast."})
  declare duration: number | null

  @column.dateTime()
  declare releasedAt: DateTime | null

  @column()
  declare isExplicit: boolean

  @column()
  declare isAbridged: boolean | null

  @column()
  declare groupId: number | null

  @column({ serializeAs: null })
  declare enabled: boolean

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @column()
  // @enum(book, audiobook, podcast, e-book)
  declare type: 'book' | 'audiobook' | 'podcast' | 'e-book'

  @manyToMany(() => Contributor, {
    pivotColumns: ['role'],
  })
  declare contributors: ManyToMany<typeof Contributor>

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

  @column({ serializeAs: null })
  declare public publisher_id: number

  @belongsTo(() => Publisher, {
    foreignKey: 'publisher_id',
  })
  declare public publisher: BelongsTo<typeof Publisher>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  private static buildSearchDocument(book: Book) {
    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      description: SearchEngineHelper.removeHtmlTags(book.summary),
      type: book.type,
      contributors: book.contributors
        ? book.contributors.map((contributor) => ({
            name: contributor.name,
            type: contributor.$extras.pivot_type,
          }))
        : null,
      genres: book.genres ? book.genres.map((genre) => genre.name) : null,
      series: book.series
        ? book.series.map((serie) => {
            return {
              name: serie.name,
              position: serie.$extras.pivot_position ? serie.$extras.pivot_position : null,
            }
          })
        : null,
      language: book.language
        ? {
            language: book.language.split('-')[0],
            code: book.language.includes('-') ? book.language.split('-')[1] : null,
          }
        : null,
    }
  }

  private static async fetchBookWithRelations(bookId: number): Promise<Book> {
    return (await Book.query()
      .where('id', bookId)
      .preload('contributors', (q) => q.pivotColumns(['role', 'type']))
      .preload('genres')
      .preload('series')
      .preload('publisher')
      .first()) as Book
  }

  private static async processSearchIndex(book: Book, action: 'add' | 'update'): Promise<void> {
    if (book.enabled) {
      const fetchedBook = await this.fetchBookWithRelations(book.id)
      const doc = this.buildSearchDocument(fetchedBook)

      if (action === 'add') {
        void bookIndex.addDocuments([doc])
      } else {
        void bookIndex.updateDocuments([doc])
      }
    }
  }

  @afterCreate()
  public static async afterCreateHook(book: Book) {
    void this.processSearchIndex(book, 'add')
  }

  @afterUpdate()
  public static async afterUpdateHook(book: Book) {
    void this.processSearchIndex(book, 'update')
  }

  @afterDelete()
  public static async afterDeleteHook(book: Book) {
    void bookIndex.deleteDocument(book.id)
  }

  // Function to enable book and disabled relations
  public static async enableBookAndRelations(bookId: number): Promise<void> {
    const book = await Book.findOrFail(bookId)
    book.enabled = true
    await book.saveWithLog()

    const fetchedBook = await this.fetchBookWithRelations(book.id)

    for (const contributor of fetchedBook.contributors) {
      if (!contributor.enabled) {
        contributor.enabled = true
        await contributor.saveWithLog()
      }
    }
    for (const genre of fetchedBook.genres) {
      if (!genre.enabled) {
        genre.enabled = true
        await genre.saveWithLog()
      }
    }
    for (const serie of fetchedBook.series) {
      if (!serie.enabled) {
        serie.enabled = true
        await serie.saveWithLog()
      }
    }
    const publisher: Publisher | undefined = fetchedBook.publisher
    if (publisher && !publisher.enabled) {
      publisher.enabled = true
      await publisher.saveWithLog()
    }
  }
}
