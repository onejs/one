import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneShare, ShareItem, ShareResult } from '../specs/OneShare.nitro'

export type { ShareItem, ShareItemType, ShareResult } from '../specs/OneShare.nitro'

let hybrid: OneShare | undefined

function native(): OneShare {
  if (Platform.OS !== 'ios') throw new Error('Share requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneShare>('OneShare')
  return hybrid
}

function share(items: ShareItem[]): Promise<ShareResult> {
  return native().share(items).catch(rethrowNativeError)
}

export const Share = Object.freeze({ share })
