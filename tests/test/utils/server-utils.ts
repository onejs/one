import 'server-only'

export function getServerTime() {
  return new Date().toISOString()
}

export function getServerEnvironment() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.VITE_ENVIRONMENT
  }
}