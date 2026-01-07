// Global function for fetching static HTML in Workers (set per-request)
let _fetchStaticHtml: ((path: string) => Promise<string | null>) | null = null

export function setFetchStaticHtml(
  fn: ((path: string) => Promise<string | null>) | null
) {
  _fetchStaticHtml = fn
}

export function getFetchStaticHtml() {
  return _fetchStaticHtml
}
