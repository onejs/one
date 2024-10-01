const protocolWarningString = `{ plugins: [["router", { origin: "...<URL>..." }]] }`

/** `lodash.memoize` */
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache: Record<string, any> = {}
  return ((...args: any[]) => {
    const key = JSON.stringify(args)
    if (cache[key]) {
      return cache[key]
    }
    const result = fn(...args)
    cache[key] = result
    return result
  }) as any
}

function sanitizeUrl(url: string): string {
  const parsed = new URL(url)

  // Allow empty protocol, http, and https
  const validProtocol =
    !parsed.protocol || parsed.protocol === 'http:' || parsed.protocol === 'https:'

  if (!validProtocol) {
    throwOrAlert(
      `One Head: Native origin has invalid protocol "${parsed.protocol}" for URL in Config: ${protocolWarningString}.`
    )
  }

  parsed.pathname = ''
  parsed.search = ''
  parsed.hash = ''
  parsed.protocol ??= 'https:'

  return parsed.toString().replace(/\/$/, '')
}

const memoSanitizeUrl = memoize(sanitizeUrl)

function getUrlFromConstants(): string | null {
  const origin = process.env.One_ORIGIN

  if (!origin) {
    throwOrAlert(
      `One Head: Add the handoff origin to the Config (requires rebuild). Add the Config Plugin ${protocolWarningString}, where \`origin\` is the hosted URL.`
    )
    // Fallback value that shouldn't be used for real.
    return 'https://expo.dev'
  }

  // Without this, the URL will go to an IP address which is not allowed.
  if (!origin.match(/^http(s)?:\/\//)) {
    console.warn(
      `One Head: origin "${origin}" is missing a \`https://\` protocol. ${protocolWarningString}.`
    )
  }

  // Return the development URL last so the user gets all production warnings first.
  return memoSanitizeUrl(origin)
}

function throwOrAlert(msg: string) {
  console.warn(`TODO FIX: ${msg}`)
  // // Production apps fatally crash which is often not helpful.
  // if (
  //   // @ts-ignore: process is defined
  //   process.env.NODE_ENV === 'production'
  // ) {
  //   console.error(msg)
  //   alert(msg)
  // } else {
  //   throw new Error(msg)
  // }
}

export function getStaticUrlFromOneRouter(pathname: string) {
  // const host = "https://expo.io";
  // Append the URL we'd find in context
  return getUrlFromConstants() + pathname
}
