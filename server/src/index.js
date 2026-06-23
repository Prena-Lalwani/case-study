/* Local dev entry — runs the Express app on a TCP port.
 * Vercel's serverless deployment uses api/index.js instead. */

import app from './app.js'

const PORT = process.env.PORT ?? 4000

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
