import { router, jsonOk, get, put, route, start, HttpServer } from '@ovotech/laminar';

// << app

const authors: Record<string, string> = { 10: 'Dave', 20: 'Bob' };
const articles: Record<string, string> = { 1: 'Hapiness', 2: 'Love' };

/**
 * Returns a laminar App object
 */
const app = router(
  /**
   * You match pathnames with strings
   */
  get('/authors', async () => jsonOk(authors)),

  /**
   * If a pathname has a {some_name} in it it would be captured and accessible with the `path` paramters
   */
  get('/authors/{id}', async ({ path: { id } }) => jsonOk(authors[id])),

  /**
   * You can have multiple parameters in the path, all of them will be extracted
   */
  get('/blog/{articleId}/authors/{authorId}', async ({ path: { authorId, articleId } }) =>
    jsonOk([articles[articleId], authors[authorId]]),
  ),

  /**
   * You have helpers available for all the HTTP methods: get, post, del, patch, put, options
   */
  put('/authors', async ({ body }) => {
    authors[body.id] = body.name;
    return jsonOk({ success: true });
  }),

  /**
   * You can also use the low level function `route` for any custom method, or no method altogether (matching any method)
   */
  route({
    path: '/blog',
    method: 'DRAFT',
    app: async ({ body }) => {
      articles[body.id] = body.name;
      return jsonOk({ success: true });
    },
  }),
);

// app

/**
 * Start the http service
 */
start([new HttpServer({ app })], console);
