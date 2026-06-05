'use strict'
// Wraps the Next.js standalone server.js with HTTPS when certs are present.
// If /app/certs/ is missing or empty it falls through to plain HTTP so the
// container still starts without certs mounted.

const { readFileSync, existsSync } = require('fs')

const KEY  = '/app/certs/key.pem'
const CERT = '/app/certs/cert.pem'

if (existsSync(KEY) && existsSync(CERT)) {
  // Patch http.createServer → https.createServer before Next.js loads,
  // so the standalone server transparently serves TLS without any other changes.
  const http  = require('http')
  const https = require('https')
  const opts  = { key: readFileSync(KEY), cert: readFileSync(CERT) }
  http.createServer = (handler) => https.createServer(opts, handler)
  console.log('▲ CampMate — HTTPS enabled (certs: /app/certs/)')
} else {
  console.log('▲ CampMate — HTTP mode (no certs at /app/certs/)')
}

require('./server.js')
