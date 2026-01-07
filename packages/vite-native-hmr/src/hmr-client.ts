import { getDevServerLocation } from './getDevServerLocation'

/**
 * 🚨🚨🚨🚨🚨🚨🚨
 *
 *
 * It seems we're doing HMR from `@vxrn/vite-native-client`
 *
 *
 * Can we remove this?
 *
 */

/**
 * Represent Hot Module Replacement Update body.
 *
 * @internal
 */
export interface HMRMessageBody {
  name: string
  time: number
  hash: string
  warnings: any[]
  errors: any[]
  modules: Record<string, string>
}

/**
 * Represent Hot Module Replacement Update message.
 *
 * @internal
 */
export interface HMRMessage {
  action: 'building' | 'built' | 'sync'
  body: HMRMessageBody | null
}

class HMRClient {
  url: string
  socket: WebSocket
  lastHash = ''

  constructor(
    private app: {
      reload: () => void
      dismissErrors: () => void
      LoadingView: {
        showMessage(text: string, type: 'load' | 'refresh'): void
        hide(): void
      }
    }
  ) {
    const port = process.env.REACT_NATIVE_SERVER_PUBLIC_PORT || 8081
    this.url = `ws://${getDevServerLocation().hostname}:${port}/__hmr?platform=${
      process.env.REACT_NATIVE_PLATFORM || 'ios'
    }`

    this.socket = new WebSocket(this.url)

    console.info(' ⓵ [hmr] connecting...')

    this.socket.onopen = () => {
      console.info(' ⓵ [hmr] connected')
    }

    this.socket.onclose = () => {
      console.info(` ⓵ [hmr] disconnected ${this.url}`)
    }

    this.socket.onerror = (event) => {
      console.error(' ⓵ [hmr] error', event)
    }

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString())
        this.processMessage(data)
      } catch (error) {
        console.warn(' ⓵ [hmr] invalid message', error)
      }
    }
  }

  upToDate(hash?: string) {
    if (hash) {
      this.lastHash = hash
    }
    return this.lastHash === __webpack_hash__
  }

  processMessage(message: HMRMessage) {
    switch (message.action) {
      case 'building':
        this.app.LoadingView.showMessage('Rebuilding...', 'refresh')
        console.info(' ⓵ [hmr] bundle rebuilding', {
          name: message.body?.name,
        })
        break
      // biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
      case 'built':
        console.info(' ⓵ [hmr] bundle rebuilt', {
          name: message.body?.name,
          time: message.body?.time,
        })
      // Fall through
      case 'sync':
        if (!message.body) {
          console.warn(' ⓵ [hmr] message body is empty')
          return
        }

        if (message.body.errors?.length) {
          message.body.errors.forEach((error) => {
            console.error('Cannot apply update due to error:', error)
          })
          this.app.LoadingView.hide()
          return
        }

        if (message.body.warnings?.length) {
          message.body.warnings.forEach((warning) => {
            console.warn(' ⓵ [hmr] bundle contains warnings:', warning)
          })
        }

        this.applyUpdate(message.body)
    }
  }

  applyUpdate(update: HMRMessageBody) {
    if (!module.hot) {
      throw new Error(' ⓵ [hmr] hot Module Replacement is disabled.')
    }

    if (!this.upToDate(update.hash) && module.hot.status() === 'idle') {
      console.info(' ⓵ [hmr] checking for updates on the server...')
      this.checkUpdates(update)
    }
  }

  checkUpdates(update: HMRMessageBody) {
    try {
      this.app.LoadingView.showMessage('Refreshing...', 'refresh')

      module.hot?.check(false).then((updatedModules) => {
        if (!updatedModules) {
          console.warn(' ⓵ [hmr] cannot find update - full reload needed')
          this.app.reload()
          return
        }

        module.hot
          ?.apply({
            ignoreDeclined: true,
            ignoreUnaccepted: false,
            ignoreErrored: false,
            onDeclined: (data) => {
              // This module declined update, no need to do anything
              console.warn(' ⓵ [hmr] ignored an update due to declined module', {
                chain: data.chain,
              })
            },
          })
          .then((renewedModules) => {
            if (!this.upToDate()) {
              this.checkUpdates(update)
            }

            // Double check to make sure all updated modules were accepted (renewed)
            const unacceptedModules = updatedModules.filter((moduleId) => {
              return renewedModules && renewedModules.indexOf(moduleId) < 0
            })

            if (unacceptedModules.length) {
              console.warn(
                ' ⓵ [hmr] not every module was accepted - full reload needed',
                {
                  unacceptedModules,
                }
              )
              this.app.reload()
            } else {
              console.info(' ⓵ [hmr] renewed modules - app is up to date', {
                renewedModules,
              })
              this.app.dismissErrors()
            }
          })
      })
    } catch (error) {
      if (module.hot?.status() === 'fail' || module.hot?.status() === 'abort') {
        console.warn(' ⓵ [hmr] cannot check for update - full reload needed')
        console.warn('[hmr]', error)
        this.app.reload()
      } else {
        console.warn(' ⓵ [hmr] update check failed', { error })
      }
    } finally {
      this.app.LoadingView.hide()
    }
  }
}

export const loadHMRClient = () => {
  const { DevSettings, Platform } = require('react-native')
  // FIXME: Make this require work
  // const LoadingView = require('react-native/Libraries/Utilities/LoadingView')
  const LoadingView = {
    showMessage: () => {},
    hide: () => {},
  }

  const reload = () => DevSettings.reload()
  const dismissErrors = () => {
    if (Platform.OS === 'ios') {
      const NativeRedBox =
        require('react-native/Libraries/NativeModules/specs/NativeRedBox').default
      NativeRedBox?.dismiss?.()
    } else {
      const NativeExceptionsManager =
        require('react-native/Libraries/Core/NativeExceptionsManager').default
      NativeExceptionsManager?.dismissRedbox()
    }

    const LogBoxData = require('react-native/Libraries/LogBox/Data/LogBoxData')
    LogBoxData.clear()
  }

  new HMRClient({ reload, dismissErrors, LoadingView })
}
