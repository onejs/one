const CLIENT_BASE_URL =
  typeof window !== 'undefined' && window.location
    ? `${window.location.protocol}//${window.location.host}`
    : ``

export function getURL() {
  // We should use `CLIENT_BASE_URL` on the client as we can't guarantee how the client is connected to the server - it's possible that the server is listening on `127.0.0.1` and the client is connected via `localhost`. Things might break if URLs don't match due to a JS module being double-loaded via two different URLs.
  // `process.env.ONE_SERVER_URL` is for the server, where `CLIENT_BASE_URL` will be blank.
  return CLIENT_BASE_URL || process.env.ONE_SERVER_URL || 'http://localhost'
}
