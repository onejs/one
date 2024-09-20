const url = `${process.env.URL || process.env.VITE_PUBLIC_URL || 'http://127.0.0.1:8081'}`
const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`

export const getURL = () => {
  return urlWithProtocol
}
