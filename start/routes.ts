/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import {
  apiKeyLimiter,
  emailLimiter,
  loginLimiter,
  r1Limiter,
  r2Limiter,
  r3Limiter,
} from '#start/limiter'
import { middleware } from '#start/kernel'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'
import { FileHelper } from '../app/helpers/file_helper.js'
const RequestsController = () => import('#controllers/requests_controller')
const ConfirmsController = () => import('#controllers/confirms_controller')
const SearchesController = () => import('#controllers/searches_controller')
const BooksController = () => import('#controllers/books_controller')
const AuthController = () => import('#controllers/auth_controller')
const ContributorsController = () => import('#controllers/contributor_controller')
const SeriesController = () => import('#controllers/series_controller')
const GenresController = () => import('#controllers/genres_controller')
const TracksController = () => import('#controllers/tracks_controller')
const PublishersController = () => import('#controllers/publishers_controller')
const UsersController = () => import('#controllers/users_controller')
const LogsController = () => import('#controllers/logs_controller')

/**
 * Swagger
 */

router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger')
})
router.get('/', async () => {
  return AutoSwagger.default.scalar('/swagger')
})

/**
 * Auth
 */

router.post('/auth/login/:email', [AuthController, 'create']).as('/auth/login').use(r1Limiter)
router.post('/auth/login', [AuthController, 'store']).use(loginLimiter).use(emailLimiter)
router.post('/auth/logout', [AuthController, 'logout']).use(middleware.auth())
router.post('/auth/apiKey', [AuthController, 'apiKey']).use(middleware.auth()).use(apiKeyLimiter)

/**
 * User
 */
router.get('/user', [UsersController, 'getMe']).use(middleware.auth()).use(r1Limiter)
router.get('/user/:id', [UsersController, 'get']).use(middleware.auth()).use(r1Limiter)
router
  .get('/user/:id/edit-history', [UsersController, 'editHistory'])
  .use(middleware.auth())
  .use(r1Limiter)

router.patch('/user', [UsersController, 'update']).use(middleware.auth()).use(r1Limiter)

/**
 * Book
 */
router.get('/book/:id', [BooksController, 'get']).use(middleware.relaxAuth()).use(r1Limiter)
router
  .get('/book/tracks/:id', [TracksController, 'getTracksForBook'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router.post('/books', [BooksController, 'create']).use(middleware.relaxAuth()).use(r3Limiter)
router.post('/books/abs', [BooksController, 'abs']).use(middleware.auth()).use(r3Limiter)

/**
 * Narrator
 */
router
  .get('/contributor/:id', [ContributorsController, 'get'])
  .use(middleware.relaxAuth())
  .use(r3Limiter)
router
  .get('/contributor/books/:id', [ContributorsController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Series
 */
router.get('/series/:id', [SeriesController, 'get']).use(middleware.relaxAuth()).use(r3Limiter)
router
  .get('/series/books/:id', [SeriesController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Genre
 */
router.get('/genre/:id', [GenresController, 'get']).use(middleware.relaxAuth()).use(r3Limiter)
router
  .get('/genre/books/:id', [GenresController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Tracks
 */
router.get('/track/:id', [TracksController, 'get']).use(middleware.relaxAuth()).use(r3Limiter)

/**
 * Publisher
 */
router
  .get('/publisher/:id', [PublishersController, 'get'])
  .use(middleware.relaxAuth())
  .use(r3Limiter)
router
  .get('/publisher/books/:id', [PublishersController, 'books'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Search
 */
router.get('/search/book', [SearchesController, 'book']).use(middleware.relaxAuth()).use(r2Limiter)
router
  .get('/search/contributor', [SearchesController, 'contributor'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router
  .get('/search/genre', [SearchesController, 'genre'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)
router
  .get('/search/series', [SearchesController, 'series'])
  .use(middleware.relaxAuth())
  .use(r2Limiter)

/**
 * Confirm
 */
router.get('/create/confirm', [ConfirmsController, 'create']).use(middleware.auth()).use(r1Limiter)

/**
 * Request
 */
router.post('/request', [RequestsController, 'index']).use(middleware.relaxAuth()).use(r1Limiter)

router
  .get('/:model/:id/edit-history', [LogsController, 'getEditHistory'])
  .where('model', {
    match: /^(book|contributor|series|genre|publisher)$/,
  })
  .use(middleware.auth())
  .use(r1Limiter)

router.put('/upload/file', async (context) => {
  const file = context.request.file('file')

  if (!file) {
    return context.response.status(400).send({
      message: 'No file uploaded',
    })
  }

  await FileHelper.saveFile(file)
})
