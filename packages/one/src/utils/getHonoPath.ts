export function getHonoPath(page: string) {
  const cleaned = page
    // /(param) => (empty)
    .replaceAll(/\/\(([^\)]+)\)/gi, '')
    // [...params] => *
    .replace(/\[\.\.\.([^\]]+)\]/gi, '*')
    // [param] => :param
    .replaceAll(/\[([^\]]+)\]/gi, ':$1')
    // +not-found => *
    .replace('+not-found', '*')
    // /index => /
    .replace(/\/index$/, '/')

  if (cleaned !== '/') {
    // remove trailing / for non / paths
    return cleaned.replace(/\/$/, '')
  }

  return cleaned
}
