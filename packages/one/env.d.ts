/// <reference types="vite/client" />

interface OneEnvVariables {
  // Core One variables
  /** Random number for each production build, or stable per dev server run. Useful for cache keys. */
  ONE_CACHE_KEY: string
  /** Your app.key setting from vite.config */
  ONE_APP_NAME: string
  /** Current running server URL in development, e.g. "http://0.0.0.0:8081". Set this yourself for production. */
  ONE_SERVER_URL: string
  /** "ssr", "ssg", or "spa" based on your defaultRenderMode setting */
  ONE_DEFAULT_RENDER_MODE: 'ssr' | 'ssg' | 'spa'

  // Platform detection
  /** "client" for client-side web, "ssr" for server-side web, "ios" or "android" for native */
  VITE_ENVIRONMENT: 'client' | 'ssr' | 'ios' | 'android'
  /** true for native platforms (iOS and Android), false for web (client and SSR). Useful for tree-shaking native-only code. */
  VITE_NATIVE: boolean
  /** "web" for web builds, "ios" or "android" for native. Matches Expo convention. */
  EXPO_OS: 'web' | 'ios' | 'android'

  // React Native (available in native builds)
  /** The React Native version string */
  REACT_NATIVE_VERSION: string
  /** "ios" or "android" in native builds */
  REACT_NATIVE_PLATFORM: 'ios' | 'android'
  /** Dev server port for React Native */
  REACT_NATIVE_SERVER_PUBLIC_PORT: string
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Partial<OneEnvVariables> {}
  }
}

interface ImportMetaEnv extends Partial<OneEnvVariables> {}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export {}
