import { useEffect } from 'react'
import { isWeb } from 'tamagui'
import { showToast } from './toast/Toast'

export const useErrorsToast = () => {
  // if web, send errors to showToast
  if (isWeb) {
    useEffect(() => {
      window.addEventListener('error', (e) => {
        const msg = e.message.trim()
        if (!msg) return
        // filter known ok errors
        if (
          !/(measurement is not an Object)|(ResizeObserver loop|Cannot use \'in\' operator)/.test(
            msg
          )
        ) {
          console.error(`msg`, msg)
          showToast(`Error: ${msg}`)
        }
      })
    }, [])
  }
}
