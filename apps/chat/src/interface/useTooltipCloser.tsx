import { useEffect } from 'react'
import { closeOpenTooltips, isWeb } from 'tamagui'

export const useTooltipCloser = () => {
  return useEffect(() => {
    if (isWeb) {
      const controller = new AbortController()
      document.addEventListener(
        'click',
        () => {
          // lets just do this on any click seems reasonable
          closeOpenTooltips()
        },
        {
          signal: controller.signal,
        }
      )
      return controller.abort
    }
  }, [])
}
