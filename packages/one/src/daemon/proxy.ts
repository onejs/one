// HTTP and WebSocket proxy for daemon

import * as http from 'node:http'
import * as net from 'node:net'
import type { ServerRegistration } from './types'

export function proxyHttpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  target: ServerRegistration
): void {
  const options: http.RequestOptions = {
    hostname: 'localhost',
    port: target.port,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      // preserve original host but add forwarded headers
      'x-forwarded-host': req.headers.host,
      'x-forwarded-for': req.socket.remoteAddress,
    },
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers)
    proxyRes.pipe(res)
  })

  proxyReq.on('error', (err) => {
    console.error(`[daemon] Proxy error to port ${target.port}:`, err.message)
    if (!res.headersSent) {
      res.writeHead(502)
      res.end(`Bad Gateway: ${err.message}`)
    }
  })

  req.pipe(proxyReq)
}

export function proxyWebSocket(
  req: http.IncomingMessage,
  socket: net.Socket,
  head: Buffer,
  target: ServerRegistration
): void {
  const proxySocket = net.connect(target.port, 'localhost', () => {
    // reconstruct the HTTP upgrade request
    const reqLines = [
      `${req.method} ${req.url} HTTP/1.1`,
      ...Object.entries(req.headers).map(([k, v]) => {
        if (Array.isArray(v)) return `${k}: ${v.join(', ')}`
        return `${k}: ${v}`
      }),
      '',
      '',
    ]

    proxySocket.write(reqLines.join('\r\n'))
    if (head.length) {
      proxySocket.write(head)
    }

    // bidirectional pipe
    socket.pipe(proxySocket)
    proxySocket.pipe(socket)
  })

  proxySocket.on('error', (err) => {
    console.error(`[daemon] WebSocket proxy error to port ${target.port}:`, err.message)
    socket.end()
  })

  socket.on('error', (err) => {
    console.error(`[daemon] Client socket error:`, err.message)
    proxySocket.end()
  })

  socket.on('close', () => {
    proxySocket.end()
  })

  proxySocket.on('close', () => {
    socket.end()
  })
}
