export const requestAsyncLocalStore = null

export const asyncHeadersCache = new WeakMap<any, Headers>()

export async function setResponseHeaders(cb: (headers: Headers) => void) {}

export function mergeHeaders(onto: Headers, from: Headers) {}
