export function getHonoPath(page: string) {
  return (
    page
      // /(param) => (empty)
      .replaceAll(/\/\(([^\)]+)\)/gi, '')
      // [...params] => *
      .replace(/\[...([^\]]+)\]/gi, '*')
      // [param] => :param
      .replaceAll(/\[([^\]]+)\]/gi, ':$1')
      // +not-found => *
      .replace('+not-found', '*')
      // /index => /
      .replace(/\/index$/, '/')
      // remove trailing /
      .replace(/\/$/, '')
  )
}
