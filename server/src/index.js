const express = require('express')
const cors = require('cors')
const { processNotes } = require('./textProcessor')

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use((_req, res, next) => {
  // Enforce non-persistent processing responses for privacy.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/process', (req, res) => {
  const { text } = req.body || {}

  if (typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({
      error: 'Please provide note text in the text field.',
    })
  }

  const result = processNotes(text)
  return res.json(result)
})

app.listen(PORT, () => {
  // Keep startup log minimal for local development.
  console.log(`MindIt API running on port ${PORT}`)
})
