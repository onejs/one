// for some reason instanceof isnt working reliably
export function isResponse(res: any) {
  return (
    res instanceof Response ||
    (typeof res.status === 'number' && 'body' in res && typeof res.ok === 'boolean')
  )
}
