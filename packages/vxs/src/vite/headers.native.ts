export const requestAsyncLocalStore = null

export const asyncHeadersCache = new WeakMap<any, Headers>()

// TODO move this to `RequestContext.setHeaders()`

export async function setCurrentRequestHeaders(cb: (headers: Headers) => void) {}

export function mergeHeaders(onto: Headers, from: Headers) {}
