export enum ExecutionEnvironment {
  Bare = 'bare',
  Standalone = 'standalone',
  StoreClient = 'storeClient',
}

const uuid = () => `${Math.random()}`.slice(3)

const ID_KEY = 'EXPO_CONSTANTS_INSTALLATION_ID'
const _sessionId = uuid()
const hasDOM = typeof window !== 'undefined'

function getBrowserName() {
  if (hasDOM) {
    const agent = navigator.userAgent?.toLowerCase() || ''
    if (agent.includes('edge')) {
      return 'Edge'
    }
    if (agent.includes('edg')) {
      return 'Chromium Edge'
    }
    if (agent.includes('opr') && !!window['opr']) {
      return 'Opera'
    }
    if (agent.includes('chrome') && !!window['chrome']) {
      return 'Chrome'
    }
    if (agent.includes('trident')) {
      return 'IE'
    }
    if (agent.includes('firefox')) {
      return 'Firefox'
    }
    if (agent.includes('safari')) {
      return 'Safari'
    }
  }
  return undefined
}

export default {
  get name() {
    return 'ExponentConstants'
  },
  get appOwnership() {
    return null
  },
  get executionEnvironment() {
    return 'bare'
  },
  get installationId() {
    let installationId
    try {
      installationId = localStorage.getItem(ID_KEY)
      if (installationId == null || typeof installationId !== 'string') {
        installationId = uuid()
        localStorage.setItem(ID_KEY, installationId)
      }
    } catch {
      installationId = _sessionId
    } finally {
      // biome-ignore lint/correctness/noUnsafeFinally: <explanation>
      return installationId
    }
  },
  get sessionId() {
    return _sessionId
  },
  get platform() {
    return { web: hasDOM ? { ua: navigator.userAgent } : undefined }
  },
  get isHeadless() {
    if (!hasDOM) return true
    return /\bHeadlessChrome\//.test(navigator.userAgent || '')
  },
  get isDevice() {
    // TODO: Bacon: Possibly want to add information regarding simulators
    return true
  },
  get expoVersion() {
    return this.manifest.sdkVersion || null
  },
  get linkingUri() {
    if (hasDOM) {
      // On native this is `exp://`
      // On web we should use the protocol and hostname (location.origin)
      return location.origin
    }
    return ''
  },
  get expoRuntimeVersion() {
    return this.expoVersion
  },
  get deviceName() {
    return getBrowserName()
  },
  get nativeAppVersion() {
    return null
  },
  get nativeBuildVersion() {
    return null
  },
  get systemFonts() {
    // TODO: Bacon: Maybe possible.
    return []
  },
  get statusBarHeight() {
    return 0
  },
  get deviceYearClass() {
    // TODO: Bacon: The android version isn't very accurate either, maybe we could try and guess this value.
    return null
  },
  get manifest() {
    // This is defined by @expo/webpack-config.
    // If your site is bundled with a different config then you may not have access to the app.json automatically.
    return process.env.APP_MANIFEST || {}
  },
  get manifest2() {
    return null
  },
  get experienceUrl() {
    if (hasDOM) {
      return location.origin
    }
    return ''
  },
  get debugMode() {
    return __DEV__
  },
  async getWebViewUserAgentAsync() {
    if (hasDOM) {
      return navigator.userAgent
    }
    return null
  },
} as any
