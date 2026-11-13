import { Bundle } from 'one/ios/Foundation'
import type { AppInfo } from './types'

export function readAppInfo(): AppInfo {
  const bundle = Bundle.main
  const string = (key: string) => {
    const value = bundle.object(key)
    return typeof value === 'string' ? value : null
  }
  return {
    version: string('CFBundleShortVersionString'),
    build: string('CFBundleVersion'),
    applicationId: string('CFBundleIdentifier'),
  }
}
