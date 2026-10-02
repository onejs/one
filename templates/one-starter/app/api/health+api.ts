import type { Endpoint } from 'one'
export const GET: Endpoint = () =>
  Response.json({
    status: 'ok',
    sha: process.env.GIT_SHA || 'dev',
    env: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
  })
