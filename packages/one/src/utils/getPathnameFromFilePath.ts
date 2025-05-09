import Path from 'node:path'

export function getPathnameFromFilePath(inputPath: string, params = {}, strict = false) {
  const path = inputPath.replace(/\+(spa|ssg|ssr)\.tsx?$/, '')
  const dirname = Path.dirname(path).replace(/\([^\/]+\)/gi, '')
  const file = Path.basename(path)
  const fileName = file.replace(/\.[a-z]+$/, '')

  function paramsError(part: string) {
    throw new Error(
      `[one] Params doesn't fit route:

      - path: ${path}
      - part: ${part}
      - fileName: ${fileName}
      - params:

${JSON.stringify(params, null, 2)}`
    )
  }

  const nameWithParams = (() => {
    if (fileName === 'index') {
      return '/'
    }
    if (fileName.startsWith('[...')) {
      const part = fileName.replace('[...', '').replace(']', '')
      if (!params[part]) {
        if (strict) {
          throw paramsError(part)
        }
        return `/*`
      }
      return `/${params[part]}`
    }
    return `/${fileName
      .split('/')
      .map((part) => {
        if (part[0] === '[') {
          const found = params[part.slice(1, part.length - 1)]
          if (!found) {
            if (strict) {
              throw paramsError(part)
            }

            return ':' + part.replace('[', '').replace(']', '')
          }
          return found
        }
        return part
      })
      .join('/')}`
  })()

  // hono path will convert +not-found etc too
  return `${dirname}${nameWithParams}`.replace(/\/\/+/gi, '/')
}
