import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { useEffect } from 'react'
import { setAuthToken } from './authClient'
import { useAuth } from './useAuth'
import { setZeroAuth } from '../state/zero'
import { isTauri } from '../tauri/constants'

export const AuthEffects = () => {
  useAuthPassTokenToTauriEffect()
  useAuthPassJWTSecretToZeroEffect()

  return null
}

const useAuthPassJWTSecretToZeroEffect = () => {
  const { jwtToken } = useAuth()

  useEffect(() => {
    if (jwtToken) {
      setZeroAuth(jwtToken)
    }
  }, [jwtToken])
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

            if (token) {
              setAuthToken(token)
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
