import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { useEffect } from 'react'
import { setZeroAuth } from '../zero/zero'
import { isTauri } from '../tauri/constants'
import { setAuthClientToken, useAuth } from './authClient'

export const AuthEffects = () => {
  useAuthPassTokenToTauriEffect()
  useAuthPassJWTSecretToZeroEffect()

  return null
}

const useAuthPassJWTSecretToZeroEffect = () => {
  const { token, user } = useAuth()

  useEffect(() => {
    if (user && token) {
      setZeroAuth({
        jwtToken: token,
        userID: user.id,
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
