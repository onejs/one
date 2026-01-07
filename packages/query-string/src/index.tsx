// Parse a query string
export const parse = (queryString: string) => {
  const params = new URLSearchParams(queryString)
  const result: Record<string, string | string[]> = {}

  params.forEach((value, key) => {
    if (result[key]) {
      if (Array.isArray(result[key])) {
        ;(result[key] as string[]).push(value)
      } else {
        result[key] = [result[key] as string, value]
      }
    } else {
      result[key] = value
    }
  })

  return result
}

// Stringify an object to query string
export const stringify = (obj: Record<string, string | string[]>) => {
  const params = new URLSearchParams()

  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => {
        params.append(key, v)
      })
    } else {
      params.append(key, value)
    }
  })

  return params.toString()
}

export default {
  parse,
  stringify,
}
