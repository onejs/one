export const CLIENT_BASE_URL =
  typeof window !== 'undefined' && window.location
    ? `${window.location.protocol}//${window.location.host}`
    : ``
