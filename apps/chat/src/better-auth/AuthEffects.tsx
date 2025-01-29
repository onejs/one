import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { useEffect } from 'react'
import { isWeb } from 'tamagui'
import { isTauri } from '~/tauri/constants'
import { setZeroAuth } from '~/zero/zero'
import { setAuthClientToken, useAuth } from './authClient'

export const AuthEffects = () => {
  useAuthPassTokenToTauriEffect()
  useAuthPassJWTSecretToZeroEffect()
  useAuthBrowser()

  return null
}

let popup: Window | null = null

export function setLoginPopup(_: Window) {
  popup = _
}

const useAuthBrowser = () => {
  if (!isWeb || isTauri) return

  useEffect(() => {
    // Listen for messages from the popup
    window.addEventListener('message', (event) => {
      if (event.origin !== origin) return
      if (event.data?.type === 'login-success') {
        popup?.close()

        // hard refresh instead
        window.location.reload()
        return

        // TODO not working:
        // refreshAuth()
        // dialogEmit({ type: 'closed' })
        // showToast(`Welcome!`)
      }
    })
  }, [])
}

const useAuthPassJWTSecretToZeroEffect = () => {
  const { token, user } = useAuth()

  useEffect(() => {
    if (user && token) {
      setZeroAuth({
        jwtToken: token,
        userId: user.id,
      })
    }
  }, [user, token])
}

const useAuthPassTokenToTauriEffect = () => {
  if (!isTauri) return

  useEffect(() => {
    try {
      onOpenUrl(([urlString]) => {
        const url = new URL(urlString)

        switch (url.host) {
          case 'finish-auth': {
            const token = url.searchParams.get('token')
            const session = url.searchParams.get('session')

            if (token && session) {
              setAuthClientToken({
                token,
                session,
              })
            }

            break
          }
        }
      })
    } catch (err) {
      console.error(err)
    }
  }, [])
}
