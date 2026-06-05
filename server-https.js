'use strict'
// Runs Next.js on an internal loopback port, then starts a real HTTPS
// server on the public port that proxies through to it.
// Certs are baked into the image; mount trusted certs at /app/certs/ to
// skip the browser security warning.

const { readFileSync } = require('fs')
const https = require('https')
const http  = require('http')

const OUTER = parseInt(process.env.PORT     || '3000',      10)
const INNER = OUTER + 100   // Next.js binds here on loopback only

process.env.PORT     = String(INNER)
process.env.HOSTNAME = '127.0.0.1'
require('./server.js')

// Poll until Next.js is ready, then start the HTTPS front
;(function wait() {
  http.get(`http://127.0.0.1:${INNER}/`, () => startHttps())
      .on('error',                        () => setTimeout(wait, 400))
})()

function startHttps() {
  const tlsOpts = {
    key:  readFileSync('/data/certs/key.pem'),
    cert: readFileSync('/data/certs/cert.pem'),
  }

  https.createServer(tlsOpts, (req, res) => {
    const proxy = http.request(
      {
        hostname: '127.0.0.1',
        port:     INNER,
        path:     req.url,
        method:   req.method,
        headers:  { ...req.headers, 'x-forwarded-proto': 'https' },
      },
      (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res, { end: true }) }
    )
    proxy.on('error', () => { res.writeHead(502); res.end() })
    req.pipe(proxy, { end: true })
  }).listen(OUTER, '0.0.0.0', () =>
    console.log(`▲ CampMate HTTPS :${OUTER}  (Next.js HTTP :${INNER})`)
  )
}
