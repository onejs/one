import { InlineConfig, UserConfig } from 'vite'

export type StartOptions = {
  root: string
  host?: string
  webPort?: number
  nativePort?: number
  webConfig?: InlineConfig
  buildConfig?: InlineConfig
  mode: UserConfig['mode']
}

export type HMRListener = (update: { file: string; contents: string }) => void
