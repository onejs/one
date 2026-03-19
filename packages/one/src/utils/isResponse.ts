// for some reason instanceof isnt working reliably
export function isResponse(res: any): res is Response {
  // fast path: most responses are instances
  if (res instanceof Response) return true
  // fallback: duck-type check for response-like objects
  return res != null && typeof res.status === 'number' && typeof res.ok === 'boolean'
}
