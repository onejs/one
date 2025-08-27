import type { OneRouter } from '../interfaces/router'
import { Platform } from 'react-native'
import { getRewriteConfig, reverseRewrite } from '../utils/rewrite'

/** Resolve an href object into a fully qualified, relative href. */
export const resolveHref = (href: OneRouter.Href): string => {
  if (typeof href === 'string') {
    return resolveHref({ pathname: href })
  }
  const path = href.pathname ?? ''
  if (!href?.params) {
    // Apply reverse rewrites if on web
    if (Platform.OS === 'web') {
      const rewrites = getRewriteConfig()
      if (Object.keys(rewrites).length > 0) {
        const externalUrl = reverseRewrite(path, rewrites)
        // If it's a full URL (subdomain rewrite), return it as-is
        if (externalUrl.startsWith('http://') || externalUrl.startsWith('https://')) {
          return externalUrl
        }
      }
    }
    return path
  }
  const { pathname, params } = createQualifiedPathname(path, {
    ...href.params,
  })
  const paramsString = createQueryParams(params)
  const fullPath = pathname + (paramsString ? `?${paramsString}` : '')

  // Apply reverse rewrites if on web
  if (Platform.OS === 'web') {
    const rewrites = getRewriteConfig()
    if (Object.keys(rewrites).length > 0) {
      const externalUrl = reverseRewrite(fullPath, rewrites)
      // If it's a full URL (subdomain rewrite), return it as-is
      if (externalUrl.startsWith('http://') || externalUrl.startsWith('https://')) {
        return externalUrl
      }
    }
  }

  return fullPath
}

function createQualifiedPathname(
  pathname: string,
  params: Record<string, any>
): { pathname: string; params: OneRouter.UnknownInputParams } {
  for (const [key, value = ''] of Object.entries(params)) {
    const dynamicKey = `[${key}]`
    const deepDynamicKey = `[...${key}]`
    if (pathname.includes(dynamicKey)) {
      pathname = pathname.replace(dynamicKey, encodeParam(value))
    } else if (pathname.includes(deepDynamicKey)) {
      pathname = pathname.replace(deepDynamicKey, encodeParam(value))
    } else {
      continue
    }

    delete params[key]
  }
  return { pathname, params }
}

function encodeParam(param: any): string {
  return Array.isArray(param)
    ? param.map((p) => encodeParam(p)).join('/')
    : encodeURIComponent(`${param}`)
}

function createQueryParams(params: Record<string, any>): string {
  return (
    Object.entries(params)
      // Allow nullish params
      .filter(([, value]) => value != null)
      .map(([key, value]) => `${key}=${encodeURIComponent(value.toString())}`)
      .join('&')
  )
}
