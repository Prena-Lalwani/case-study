/* Vercel Serverless Function entry — re-exports the Express app.
 * Vercel auto-wraps any Express app exported from /api as a handler. */

import app from '../server/src/app.js'

export default app
