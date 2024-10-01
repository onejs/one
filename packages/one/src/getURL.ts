import { CLIENT_BASE_URL } from './router/constants'

export function getURL() {
  return process.env.ONE_SERVER_URL ?? CLIENT_BASE_URL
}
