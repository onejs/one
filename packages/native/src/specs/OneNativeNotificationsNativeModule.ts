import type { TurboModule } from 'react-native'

import type {
  NotificationPermissionRequest,
  NotificationPermissionResponse,
} from '../notifications/types'

// type-only contract for the OneNativeNotifications legacy native module.
// codegenConfig covers components only, so this spec is never an input to
// codegen; the native entries resolve it through the generic
// TurboModuleRegistry.get, which falls back to the legacy module.
export interface Spec extends TurboModule {
  getPermissions(): Promise<NotificationPermissionResponse>
  requestPermissions(
    options: NotificationPermissionRequest
  ): Promise<NotificationPermissionResponse>
  getBadgeCount(): Promise<number>
  setBadgeCount(count: number): Promise<boolean>
}
