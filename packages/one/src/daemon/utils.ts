// daemon utility functions

import * as fs from 'node:fs'
import * as path from 'node:path'

export interface AppConfig {
  expo?: {
    name?: string
    slug?: string
    ios?: {
      bundleIdentifier?: string
    }
    android?: {
      package?: string
    }
  }
  // bare RN config
  name?: string
}

export function getBundleIdFromConfig(root: string): string | undefined {
  const appJsonPath = path.join(root, 'app.json')

  if (!fs.existsSync(appJsonPath)) {
    return undefined
  }

  try {
    const appConfig: AppConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'))

    // try expo config first
    if (appConfig.expo?.ios?.bundleIdentifier) {
      return appConfig.expo.ios.bundleIdentifier
    }

    if (appConfig.expo?.android?.package) {
      return appConfig.expo.android.package
    }

    // fallback to slug or name
    if (appConfig.expo?.slug) {
      return appConfig.expo.slug
    }

    if (appConfig.expo?.name) {
      return appConfig.expo.name.toLowerCase().replace(/\s+/g, '-')
    }

    if (appConfig.name) {
      return appConfig.name.toLowerCase().replace(/\s+/g, '-')
    }

    return undefined
  } catch {
    return undefined
  }
}

const MAX_PORT = 65535

export function getAvailablePort(preferredPort: number, excludePort?: number): Promise<number> {
  return new Promise((resolve, reject) => {
    // dynamic import to avoid top-level require
    import('node:net').then((netModule) => {
      const server = netModule.createServer()

      const tryPort = (port: number) => {
        if (port > MAX_PORT) {
          reject(new Error(`No available port found between ${preferredPort} and ${MAX_PORT}`))
          return
        }

        if (port === excludePort) {
          tryPort(port + 1)
          return
        }

        server.once('error', () => {
          tryPort(port + 1)
        })

        server.once('listening', () => {
          server.close(() => {
            resolve(port)
          })
        })

        server.listen(port, '127.0.0.1')
      }

      tryPort(preferredPort)
    })
  })
}
