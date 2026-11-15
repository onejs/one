import { UIApplication } from 'one/ios/UIKit'
import OneNativeKeepAwake from './one-native-keep-awake.shared'

async function readNativeState(): Promise<boolean> {
  return (await UIApplication.shared).isIdleTimerDisabled
}

export default function OneNativeKeepAwakeIOS() {
  return <OneNativeKeepAwake readNativeState={readNativeState} />
}
