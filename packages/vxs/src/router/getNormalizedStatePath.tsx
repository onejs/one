import { stripBaseUrl } from '../fork/getStateFromPath'

type SearchParams = Record<string, string | string[]>

export type UrlObject = {
  unstable_globalHref: string
  pathname: string
  readonly params: SearchParams
  segments: string[]
  isIndex: boolean
}

// TODO: Split up getPathFromState to return all this info at once.
export function getNormalizedStatePath(
  {
    path: statePath,
    params,
  }: {
    path: string
    params: any
  },
  baseUrl?: string
): Pick<UrlObject, 'segments' | 'params'> {
  const [pathname] = statePath.split('?')
  return {
    // Strip empty path at the start
    segments: stripBaseUrl(pathname, baseUrl).split('/').filter(Boolean).map(decodeURIComponent),
    // TODO: This is not efficient, we should generate based on the state instead
    // of converting to string then back to object
    params: Object.entries(params).reduce((prev, [key, value]) => {
      if (Array.isArray(value)) {
        prev[key] = value.map((v: string) => {
          try {
            return decodeURIComponent(v)
          } catch {
            return v
          }
        })
      } else {
        try {
          prev[key] = decodeURIComponent(value as string)
        } catch {
          prev[key] = value as string
        }
      }
      return prev
    }, {} as SearchParams),
  }
}
