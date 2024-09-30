const url = `${process.env.URL || process.env.VITE_PUBLIC_URL || 'http://127.0.0.1:8081'}`
const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`

/**
 * Helper to get the current URL of the running web application
 */
export const getURL = () => {
  return urlWithProtocol
}
