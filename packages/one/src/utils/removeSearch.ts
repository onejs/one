export function removeSearch(url: string) {
  return url.replace(/\#.*/, '')
}
