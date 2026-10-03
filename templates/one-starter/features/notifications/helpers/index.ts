import { createContext, createElement, useContext } from 'react'
import {
  DEFAULT_FOREGROUND_POLICY,
  presentsInAppNotification,
  systemForegroundPresentation,
} from './foregroundPolicy'
import {
  notificationPermissionAlerts,
  notificationPermissionDelivers,
  readNotificationPermission,
} from './permission'
import { notificationResponseKey, readNotificationResponse } from './response'
import { NOTIFICATION_ID_DATA_KEY } from './types'
import type {
  NotificationPermissionResponse,
  NotificationPermissionState,
} from './permission'
import type { NotificationResponseInput } from './response'
import type {
  NotificationForegroundPolicy,
  NotificationForegroundPresentation,
  NotificationPermission,
  NotificationPermissionStatus,
  NotificationResponseEvent,
  NotificationResponseHandler,
  NotificationResponseIssue,
  NotificationResponseResult,
  NotificationsProviderProps,
  PushRegistration,
  PushRegistrationMeta,
  PushRegistrationStatus,
  PushPlatform,
  RegisterDevicePushToken,
} from './types'

const NotificationsContext = createContext<NotificationForegroundPolicy | null>(null)

const unsupportedRegistration: PushRegistration = {
  status: 'unsupported',
  error: null,
  register: async () => null,
}

// the browser build presents nothing through the operating system, so there is
// no authorization to hold and nothing to prompt for.
const unsupportedPermission: NotificationPermission = {
  status: 'unsupported',
  canAskAgain: false,
  error: null,
  request: async () => 'unsupported',
}

export function NotificationsProvider({
  children,
  foregroundPolicy = DEFAULT_FOREGROUND_POLICY,
}: NotificationsProviderProps) {
  return createElement(
    NotificationsContext.Provider,
    { value: foregroundPolicy },
    children,
  )
}

export function usePushRegistration(): PushRegistration {
  useNotificationsProvider()
  return unsupportedRegistration
}

// same return type as the native entrypoint so consumers get one platform-
// agnostic contract (a token or null); the web build simply always yields null.
export function useDevicePushToken(): string | null {
  useNotificationsProvider()
  return null
}

// the configured policy is reported unchanged on web. the browser has no
// operating-system foreground presentation here, so a product that reads this
// keeps presenting events itself under `inApp` and stays silent otherwise.
export function useNotificationForegroundPolicy(): NotificationForegroundPolicy {
  return useNotificationsProvider()
}

export function useNotificationPermission(): NotificationPermission {
  useNotificationsProvider()
  return unsupportedPermission
}

function useNotificationsProvider(): NotificationForegroundPolicy {
  const policy = useContext(NotificationsContext)
  if (!policy) {
    throw new Error('~/features/notifications/helpers hooks require NotificationsProvider')
  }
  return policy
}

export {
  DEFAULT_FOREGROUND_POLICY,
  NOTIFICATION_ID_DATA_KEY,
  notificationPermissionAlerts,
  notificationPermissionDelivers,
  notificationResponseKey,
  presentsInAppNotification,
  readNotificationPermission,
  readNotificationResponse,
  systemForegroundPresentation,
}

export type {
  NotificationForegroundPolicy,
  NotificationForegroundPresentation,
  NotificationPermission,
  NotificationPermissionResponse,
  NotificationPermissionState,
  NotificationPermissionStatus,
  NotificationResponseEvent,
  NotificationResponseHandler,
  NotificationResponseInput,
  NotificationResponseIssue,
  NotificationResponseResult,
  NotificationsProviderProps,
  PushPlatform,
  PushRegistration,
  PushRegistrationMeta,
  PushRegistrationStatus,
  RegisterDevicePushToken,
}
