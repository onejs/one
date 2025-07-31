import 'client-only'

export function getBrowserInfo() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    onLine: navigator.onLine
  }
}

export function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  }
}