import type { TurboModule } from 'react-native'

import type {
  Notification,
  NotificationBehavior,
  NotificationChannel,
  NotificationChannelInput,
  NotificationPermissionRequest,
  NotificationPermissionResponse,
  NotificationResponse,
  NotificationScheduleInput,
  ScheduledNotification,
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
  setNotificationChannel(
    channelId: string,
    channel: NotificationChannelInput
  ): Promise<NotificationChannel | null>
  getNotificationChannel(channelId: string): Promise<NotificationChannel | null>
  getNotificationChannels(): Promise<NotificationChannel[]>
  deleteNotificationChannel(channelId: string): Promise<void>
  scheduleNotification(request: NotificationScheduleInput): Promise<string>
  cancelScheduledNotification(identifier: string): Promise<void>
  cancelAllScheduledNotifications(): Promise<void>
  getAllScheduledNotifications(): Promise<ScheduledNotification[]>
  getPresentedNotifications(): Promise<Notification[]>
  dismissNotification(identifier: string): Promise<void>
  dismissAllNotifications(): Promise<void>
  presentNotification(requestId: string, behavior: NotificationBehavior): Promise<void>
  getLastNotificationResponse(): NotificationResponse | null
  clearLastNotificationResponse(): void
  addListener(eventName: string): void
  removeListeners(count: number): void
}
