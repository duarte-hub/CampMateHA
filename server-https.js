'use strict'
// If certs are mounted at /app/certs/ this starts Next.js on an internal
// loopback port and places a real HTTPS server in front of it.
// Without certs it just runs the plain HTTP server unchanged.

const { readFileSync, existsSync } = require('fs')
const https = require('https')
const http  = require('http')

const KEY  = '/app/certs/key.pem'
const CERT = '/app/certs/cert.pem'

if (!existsSync(KEY) || !existsSync(CERT)) {
  console.log('▲ CampMate — HTTP mode (mount certs at /app/certs/ for HTTPS)')
  require('./server.js')
} else {
  const OUTER = parseInt(process.env.PORT || '3000', 10)
  const INNER = OUTER + 100   // Next.js binds here, never exposed

  // Tell Next.js to bind on loopback only
  process.env.PORT     = String(INNER)
  process.env.HOSTNAME = '127.0.0.1'
  require('./server.js')

  // Poll until Next.js is accepting connections, then start HTTPS proxy
  function waitThenProxy() {
    http.get(`http://127.0.0.1:${INNER}/`, () => startProxy())
        .on('error',  () => setTimeout(waitThenProxy, 300))
  }

  function startProxy() {
    const tlsOpts = { key: readFileSync(KEY), cert: readFileSync(CERT) }

    https.createServer(tlsOpts, (req, res) => {
      const upstream = http.request({
        hostname: '127.0.0.1',
        port:     INNER,
        path:     req.url,
        method:   req.method,
        headers:  {
          ...req.headers,
          'x-forwarded-proto': 'https',
          'x-forwarded-for':   req.socket.remoteAddress,
        },
      }, (upRes) => {
        res.writeHead(upRes.statusCode, upRes.headers)
        upRes.pipe(res, { end: true })
      })

      upstream.on('error', () => { res.writeHead(502); res.end() })
      req.pipe(upstream, { end: true })
    }).listen(OUTER, '0.0.0.0', () => {
      console.log(`▲ CampMate — HTTPS :${OUTER}  (Next.js HTTP :${INNER})`)
    })
  }

  waitThenProxy()
}
