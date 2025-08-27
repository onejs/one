/**
 * URL rewriting utilities for handling subdomain and path rewrites
 */

export interface RewriteRule {
  pattern: RegExp
  target: (match: RegExpMatchArray, host?: string) => string
  isSubdomain: boolean
}

/**
 * Parse a rewrite rule string into a pattern and target function
 * Examples:
 * - '*.start.chat': '/server/*' (subdomain wildcard)
 * - 'admin.app.com': '/admin' (exact subdomain)
 * - '/old/*': '/new/*' (path rewrite)
 */
export function parseRewriteRule(ruleKey: string, ruleValue: string): RewriteRule {
  const isSubdomain = !ruleKey.startsWith('/')

  // Escape special regex characters except for *
  const escapedPattern = ruleKey.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '([^./]+)')

  const pattern = isSubdomain ? new RegExp(`^${escapedPattern}$`) : new RegExp(`^${escapedPattern}`)

  const target = (match: RegExpMatchArray, host?: string) => {
    let result = ruleValue

    // Replace wildcards in target with captured groups
    match.slice(1).forEach((group, index) => {
      result = result.replace('*', group)
    })

    return result
  }

  return { pattern, target, isSubdomain }
}

/**
 * Apply rewrite rules to a URL
 * Returns a new URL if a rule matches, null otherwise
 */
export function applyRewrites(url: URL, rewrites: Record<string, string>): URL | null {
  const host = url.hostname
  const pathname = url.pathname

  for (const [ruleKey, ruleValue] of Object.entries(rewrites)) {
    const rule = parseRewriteRule(ruleKey, ruleValue)

    if (rule.isSubdomain) {
      // Check if host matches the pattern
      const match = rule.pattern.exec(host)
      if (match) {
        const newUrl = new URL(url.toString())
        newUrl.pathname = rule.target(match, host) + pathname
        return newUrl
      }
    } else {
      // Check if pathname matches the pattern
      const match = rule.pattern.exec(pathname)
      if (match) {
        const newUrl = new URL(url.toString())
        newUrl.pathname = rule.target(match)
        return newUrl
      }
    }
  }

  return null
}

/**
 * Reverse a rewrite for Link components
 * Converts internal paths back to external URLs
 * Example: '/server/tamagui/docs' → 'https://tamagui.start.chat/docs'
 */
export function reverseRewrite(
  path: string,
  rewrites: Record<string, string>,
  currentHost?: string
): string {
  // Try to find a matching rewrite rule that would produce this path
  for (const [ruleKey, ruleValue] of Object.entries(rewrites)) {
    const rule = parseRewriteRule(ruleKey, ruleValue)

    if (rule.isSubdomain) {
      // Check if this path could be the result of this rewrite
      // For '*.start.chat': '/server/*', check if path starts with '/server/'
      const valuePattern = ruleValue.replace(/\*/g, '([^/]+)')
      const valueRegex = new RegExp(`^${valuePattern}(.*)$`)
      const match = valueRegex.exec(path)

      if (match) {
        // Reconstruct the original subdomain URL
        const subdomain = match[1]
        const remainingPath = match[2] || ''

        // Replace * in the rule key with the extracted subdomain
        const originalHost = ruleKey.replace('*', subdomain)

        // In browser environment, use the current protocol and port
        if (typeof window !== 'undefined') {
          const protocol = window.location.protocol
          const port = window.location.port ? `:${window.location.port}` : ''
          return `${protocol}//${originalHost}${port}${remainingPath}`
        } else {
          // Server-side default
          return `https://${originalHost}${remainingPath}`
        }
      }
    } else {
      // For path rewrites like '/old/*': '/new/*'
      const valuePattern = ruleValue.replace(/\*/g, '(.+)')
      const valueRegex = new RegExp(`^${valuePattern}$`)
      const match = valueRegex.exec(path)

      if (match) {
        // Replace wildcards in the original rule with matched groups
        let originalPath = ruleKey
        match.slice(1).forEach((group) => {
          originalPath = originalPath.replace('*', group)
        })
        return originalPath
      }
    }
  }

  // No matching rewrite found, return original path
  return path
}

/**
 * Get rewrite configuration from environment
 */
export function getRewriteConfig(): Record<string, string> {
  if (typeof process !== 'undefined' && process.env.ONE_URL_REWRITES) {
    try {
      return JSON.parse(process.env.ONE_URL_REWRITES)
    } catch {
      console.warn('Failed to parse ONE_URL_REWRITES')
      return {}
    }
  }

  // Check for import.meta.env (Vite)
  try {
    // @ts-ignore - import.meta might not be available
    if (typeof import.meta !== 'undefined' && import.meta.env?.ONE_URL_REWRITES) {
      // @ts-ignore
      return JSON.parse(import.meta.env.ONE_URL_REWRITES)
    }
  } catch {
    // import.meta not available
  }

  return {}
}
