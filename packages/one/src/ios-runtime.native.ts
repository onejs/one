import { NitroModules } from 'react-native-nitro-modules'
import type { OneSDK } from './platform/specs/OneSDK.nitro'
import { setSDKNative } from './platform/sdk/wire'

setSDKNative(() => NitroModules.createHybridObject<OneSDK>('OneSDK'))
export * from './platform/sdk/wire'
export { defineSDKMembers, defineSDKFramework } from './platform/sdk/materialize'
