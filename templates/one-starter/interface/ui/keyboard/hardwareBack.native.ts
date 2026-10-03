// hardware-back handler: the android analog of escape-to-dismiss.
//
// each open dismissable layer registers while open; the platform calls the
// most recently registered handler first, and returning true consumes the
// press, so stacked layers unwind top-first and the press never reaches the
// router while a layer is open. no-op on iOS, which has no hardware back key;
// web has its own file, where Escape covers it.
//
// pass a stable handler: re-registering moves the layer to the front of the
// dispatch order.

import { useEffect } from 'react'
import { BackHandler } from 'react-native'

export function useHardwareBackHandler(handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handler()
      return true
    })
    return () => subscription.remove()
  }, [handler, enabled])
}
