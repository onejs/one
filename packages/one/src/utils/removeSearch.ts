export function removeSearch(url: string) {
  return url
    .replace(/#.*/, '') // remove hash
    .replace(/\?.*/, '') // remove query params
}
