import { One } from 'one'
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AppState } from 'react-native'
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
  PushPlatform,
  PushRegistration,
  PushRegistrationMeta,
  PushRegistrationStatus,
  RegisterDevicePushToken,
} from './types'

type NotificationsContextValue = Readonly<{
  devicePushToken: string | null
  foregroundPolicy: NotificationForegroundPolicy
  permission: NotificationPermission
  registration: PushRegistration
}>

const INITIAL_PERMISSION: NotificationPermissionState = {
  status: 'undetermined',
  canAskAgain: true,
}

type DevicePushToken = Awaited<ReturnType<typeof One.Notifications.getDevicePushToken>>
type NotificationResponse = NonNullable<
  ReturnType<typeof One.Notifications.getLastResponse>
>

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({
  children,
  register,
  foregroundPolicy = DEFAULT_FOREGROUND_POLICY,
  onNotificationResponse,
}: NotificationsProviderProps) {
  const registerRef = useRef(register)
  const responseHandlerRef = useRef(onNotificationResponse)
  const registrationPromiseRef = useRef<Promise<string | null> | null>(null)
  const registeredRef = useRef(false)
  const devicePushTokenRef = useRef<string | null>(null)
  const [devicePushToken, setDevicePushToken] = useState<string | null>(null)
  const [status, setStatus] = useState<PushRegistrationStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [permissionError, setPermissionError] = useState<Error | null>(null)
  const [permissionState, setPermissionState] =
    useState<NotificationPermissionState>(INITIAL_PERMISSION)
  const permissionStateRef = useRef<NotificationPermissionState>(INITIAL_PERMISSION)
  const mountedRef = useRef(true)

  useEffect(() => {
    registerRef.current = register
  }, [register])

  const refreshPermission =
    useCallback(async (): Promise<NotificationPermissionStatus> => {
      try {
        const next = readNotificationPermission(await One.Notifications.getPermissions())
        permissionStateRef.current = next
        if (mountedRef.current) {
          setPermissionState(next)
          setPermissionError(null)
        }
        return next.status
      } catch (cause) {
        if (mountedRef.current) {
          setPermissionError(cause instanceof Error ? cause : new Error(String(cause)))
        }
        return permissionStateRef.current.status
      }
    }, [])

  // reading never prompts. refresh on mount and whenever the app returns from
  // system settings, where a previously denied authorization can change.
  useEffect(() => {
    mountedRef.current = true
    void refreshPermission()
    let previous = AppState.currentState
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && previous !== 'active') void refreshPermission()
      previous = next
    })
    return () => {
      mountedRef.current = false
      subscription.remove()
    }
  }, [refreshPermission])

  useEffect(() => {
    responseHandlerRef.current = onNotificationResponse
  }, [onNotificationResponse])

  // the foreground presentation policy is installed by the provider rather than
  // at import, so the app's chosen policy is the one the operating system sees.
  useEffect(() => {
    const behavior = systemForegroundPresentation(foregroundPolicy)
    One.Notifications.setHandler({
      handleNotification: () => Promise.resolve(behavior),
    })
    return () => One.Notifications.setHandler(null)
  }, [foregroundPolicy])

  const submitToken = useCallback(
    async (token: DevicePushToken): Promise<string | null> => {
      if (
        (token.type !== 'ios' && token.type !== 'android') ||
        typeof token.data !== 'string'
      ) {
        setError(new Error(`Unsupported device push token type: ${token.type}`))
        setStatus('error')
        return null
      }

      const submit = registerRef.current
      if (!submit) return null

      devicePushTokenRef.current = token.data
      setDevicePushToken(token.data)
      setError(null)
      setStatus('registering')

      try {
        await submit(token.data, { platform: token.type })
        setStatus('registered')
        return token.data
      } catch (cause) {
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setStatus('error')
        return null
      }
    },
    [],
  )

  // the one permission path. the platform shows its prompt only while the
  // decision is still undetermined; calling this again after a decision reports
  // that decision without a second prompt.
  const requestPermission =
    useCallback(async (): Promise<NotificationPermissionStatus> => {
      try {
        const next = readNotificationPermission(
          await One.Notifications.requestPermissions(),
        )
        permissionStateRef.current = next
        if (mountedRef.current) {
          setPermissionState(next)
          setPermissionError(null)
        }
        return next.status
      } catch (cause) {
        if (mountedRef.current) {
          setPermissionError(cause instanceof Error ? cause : new Error(String(cause)))
        }
        return permissionStateRef.current.status
      }
    }, [])

  const requestRegistration = useCallback((): Promise<string | null> => {
    if (!registerRef.current) return Promise.resolve(null)
    if (registrationPromiseRef.current) return registrationPromiseRef.current

    const promise = (async () => {
      setError(null)
      setStatus('requesting-permission')

      try {
        // provisional authorization still delivers, quietly, so a device token
        // is worth registering under it. only a real refusal stops here.
        if (!notificationPermissionDelivers(await requestPermission())) {
          setStatus('permission-denied')
          return null
        }

        const token = await One.Notifications.getDevicePushToken()
        const registeredToken = await submitToken(token)
        if (registeredToken) registeredRef.current = true
        return registeredToken
      } catch (cause) {
        setError(cause instanceof Error ? cause : new Error(String(cause)))
        setStatus('error')
        return null
      } finally {
        registrationPromiseRef.current = null
      }
    })()

    registrationPromiseRef.current = promise
    return promise
  }, [requestPermission, submitToken])

  useEffect(() => {
    const deliverResponse = (input: NotificationResponseInput) => {
      responseHandlerRef.current?.(readNotificationResponse(input))
    }

    const tokenSubscription = One.Notifications.addPushTokenListener((token) => {
      if (!registeredRef.current || token.data === devicePushTokenRef.current) return
      void submitToken(token)
    })

    const lastResponse = One.Notifications.getLastResponse()
    if (lastResponse) One.Notifications.clearLastResponse()

    const responseSubscription = One.Notifications.addResponseReceivedListener(
      (response) => deliverResponse(responseInput(response)),
    )

    if (lastResponse) deliverResponse(responseInput(lastResponse))

    return () => {
      tokenSubscription.remove()
      responseSubscription.remove()
    }
  }, [submitToken])

  const registration = useMemo<PushRegistration>(
    () => ({
      status: register ? status : 'unsupported',
      error,
      register: requestRegistration,
    }),
    [error, register, requestRegistration, status],
  )
  const permission = useMemo<NotificationPermission>(
    () => ({ ...permissionState, error: permissionError, request: requestPermission }),
    [permissionError, permissionState, requestPermission],
  )
  const value = useMemo<NotificationsContextValue>(
    () => ({ devicePushToken, foregroundPolicy, permission, registration }),
    [devicePushToken, foregroundPolicy, permission, registration],
  )

  return createElement(NotificationsContext.Provider, { value }, children)
}

export function usePushRegistration(): PushRegistration {
  return useNotificationsContext().registration
}

export function useDevicePushToken(): string | null {
  return useNotificationsContext().devicePushToken
}

export function useNotificationForegroundPolicy(): NotificationForegroundPolicy {
  return useNotificationsContext().foregroundPolicy
}

export function useNotificationPermission(): NotificationPermission {
  return useNotificationsContext().permission
}

function useNotificationsContext(): NotificationsContextValue {
  const value = useContext(NotificationsContext)
  if (!value) {
    throw new Error('app notifications hooks require NotificationsProvider')
  }
  return value
}

function responseInput(response: NotificationResponse): NotificationResponseInput {
  return {
    actionIdentifier: response.actionIdentifier,
    data: response.notification.request.content.data,
  }
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
