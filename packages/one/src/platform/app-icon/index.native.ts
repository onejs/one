import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneAppIcon } from '../specs/OneAppIcon.nitro'
import type { AppIconEntry } from './types'

export type { AppIconEntry }

let hybrid: OneAppIcon | undefined

function native(): OneAppIcon {
  hybrid ??= NitroModules.createHybridObject<OneAppIcon>('OneAppIcon')
  return hybrid
}

function isSupported(): Promise<boolean> {
  return native().isSupported().catch(rethrowNativeError)
}

function getCurrentName(): Promise<string | undefined> {
  return native().getCurrentName().catch(rethrowNativeError)
}

function setIcon(name?: string): Promise<void> {
  return native().setIcon(name).catch(rethrowNativeError)
}

// the preview size prebuild writes, in points.
const PREVIEW_SIZE = 64

// the primary icon first, then each alternate in config order, with the
// resource names of the previews prebuild bundled. the build-time
// ONE_APP_ICONS define is a literal member expression, which is what vite's
// define replaces.
function list(): AppIconEntry[] {
  const raw = process.env.ONE_APP_ICONS
  if (typeof raw !== 'string' || raw === '') return []
  const entries: Array<{ name?: string; ios: string; android: string }> = JSON.parse(raw)
  return entries.map((entry) => ({
    name: entry.name,
    preview: {
      uri: Platform.OS === 'android' ? entry.android : entry.ios,
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
    },
  }))
}

export const AppIcon = Object.freeze({ isSupported, getCurrentName, setIcon, list })
