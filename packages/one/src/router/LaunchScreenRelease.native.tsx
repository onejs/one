import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'
import {
  holdLaunchScreenForRouter,
  releaseLaunchScreenForRouter,
} from '../platform/launchScreen/index.native'

// ios releases the launch screen on react native's first content, which is the
// router's provider shell: native resolves its initial url asynchronously, so
// the root layout, where an app calls preventAutoHide, evaluates only after
// that release and the app shows an empty window in between. the router holds
// it from before its first commit until its first route renders.
const holds = Platform.OS === 'ios' && holdLaunchScreenForRouter()

export function LaunchScreenRelease(props?: { hold?: boolean }) {
  useLayoutEffect(() => {
    if (props?.hold) return
    if (holds) releaseLaunchScreenForRouter()
  }, [props?.hold])
  return null
}
