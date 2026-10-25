import type { ConfigT } from 'metro-config'

export type MetroConfig = ConfigT

export type ExtraConfig = {
  getResolveMainModuleName?: (p: { platform: 'ios' | 'android' | 'macos' | 'linux' }) => string
}

export type MetroConfigExtended = MetroConfig & ExtraConfig
