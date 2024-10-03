const CLIENT_BASE_URL =
  typeof window !== 'undefined' && window.location
    ? `${window.location.protocol}//${window.location.host}`
    : ``

export function getURL() {
  return process.env.ONE_SERVER_URL ?? CLIENT_BASE_URL
}
