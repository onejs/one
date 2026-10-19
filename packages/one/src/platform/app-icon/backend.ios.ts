import { Bundle, NSError } from 'one/ios/Foundation'
import { UIApplication } from 'one/ios/UIKit'

let changing = false

function failure(code: string, detail: string): Error {
  return Object.assign(new Error(`AppIcon.setIcon: ${detail}`), { code })
}

const backend = {
  async isSupported(): Promise<boolean> {
    return (await UIApplication.shared).supportsAlternateIcons
  },
  async getCurrentName(): Promise<string | undefined> {
    return (await (await UIApplication.shared).alternateIconName) ?? undefined
  },
  async setIcon(name?: string): Promise<void> {
    if (name !== undefined) {
      const icons = Bundle.main.object('CFBundleIcons') as {
        CFBundleAlternateIcons?: Record<string, unknown>
      } | null
      if (!Object.hasOwn(icons?.CFBundleAlternateIcons ?? {}, name)) {
        throw failure('E_APP_ICON_INPUT', `unknown alternate icon ${name}`)
      }
    }
    const app = await UIApplication.shared
    if (!(await app.supportsAlternateIcons)) {
      throw failure('E_APP_ICON_UNAVAILABLE', 'alternate icons are unavailable')
    }
    if ((await app.applicationState) !== 'active') {
      throw failure('E_APP_ICON_INACTIVE', 'app must be active')
    }
    if (changing) throw failure('E_APP_ICON_BUSY', 'another icon change is in progress')
    changing = true
    try {
      if ((await app.alternateIconName) === (name ?? null)) return
      await new Promise<void>((resolve, reject) => {
        app.setAlternateIconName(name, (error) => {
          if (error) reject(failure('E_APP_ICON_CHANGE', new NSError(error.$handle).localizedDescription))
          else resolve()
        }).catch(reject)
      })
    } finally {
      changing = false
    }
  },
}

export function appIconNative() {
  return backend
}
