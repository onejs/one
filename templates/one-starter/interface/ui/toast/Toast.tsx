import { useSafeAreaInsets } from 'one'
import {
  SizableText,
  Theme,
  XStack,
  YStack,
  isWeb,
  type ThemeName,
} from 'tamagui'
import { Toast, toast, useToastItem, useToasts, type ToastT } from 'tamagui/toast'
import { Button } from '../buttons/Button'
import { TOAST_RADIUS } from './toastGlass'
import { ToastSurface } from './ToastSurface'
import type { Icon } from '../icons/types'
import type { ReactElement, ReactNode } from 'react'

export type ToastType = 'error' | 'warn' | 'warning' | 'info' | 'success'

export type ToastAction = {
  label: string
  onPress: () => void | Promise<void>
}

export type ToastOptions = {
  type?: ToastType
  message?: string
  description?: string
  duration?: number
  persist?: boolean
  action?: ToastAction
  cancel?: ToastAction
  icon?: Icon
  id?: string | number
  onDismiss?: (toast: ToastT) => void
  onAutoClose?: (toast: ToastT) => void
}

export const TOAST_ACTION_HANDLER_DATA_KEY = 'actionOnPress'
export const TOAST_CANCEL_HANDLER_DATA_KEY = 'cancelOnPress'

type ToastDisplayType = Exclude<NonNullable<ToastT['type']>, 'default' | 'loading'>

// semantic toast type -> tamagui subtle color theme. info stays on the plain
// glass: the default configs apps start from carry no blue theme
const toastThemes: Partial<Record<NonNullable<ToastT['type']>, ThemeName>> = {
  success: 'green',
  error: 'red',
  warning: 'yellow',
}

function normalizeToastType(type: ToastType | undefined): ToastDisplayType | undefined {
  return type === 'warn' ? 'warning' : type
}

function mapTypeToToastMethod(type: ToastType | undefined) {
  const normalizedType = normalizeToastType(type)
  if (normalizedType === 'error') return toast.error
  if (normalizedType === 'warning') return toast.warning
  if (normalizedType === 'success') return toast.success
  if (normalizedType === 'info') return toast.info
  return toast
}

export const showToast = (
  title: string,
  {
    type,
    message,
    description,
    duration,
    persist,
    action,
    cancel,
    icon: ToastIcon,
    id,
    onDismiss,
    onAutoClose,
  }: ToastOptions = {},
) => {
  const fn = mapTypeToToastMethod(type)
  const data: Record<string, unknown> = {}
  if (action) data[TOAST_ACTION_HANDLER_DATA_KEY] = action.onPress
  if (cancel) data[TOAST_CANCEL_HANDLER_DATA_KEY] = cancel.onPress
  if (persist) data.persist = true

  const effectiveDuration = persist ? Number.POSITIVE_INFINITY : duration

  return fn(title, {
    description: description ?? message,
    duration: effectiveDuration,
    id,
    icon: ToastIcon ? <ToastIcon size={18} color="color" /> : undefined,
    action: action ? { label: action.label } : undefined,
    cancel: cancel ? { label: cancel.label } : undefined,
    data: Object.keys(data).length ? data : undefined,
    onDismiss,
    onAutoClose,
  })
}

export const hideToast = (id?: string | number) => {
  toast.dismiss(id)
}

// the app renders beside <Toast>, never inside it: toast() is global, and the
// provider's subtree is the toast viewport only, so no toast setting can wrap
// the page.
export const ToastProvider = ({
  children,
  renderClose,
}: {
  // optional so a layout can mount the host on its own, beside its tree
  children?: ReactNode
  renderClose?: () => ReactElement
}) => {
  const insets = useSafeAreaInsets()
  return (
    <>
      {children}
      <Toast
        position={isWeb ? 'top-right' : 'top-center'}
        duration={3000}
        visibleToasts={3}
        gap={8}
        // native stacks at a fixed pitch: a two line card is about this tall
        toastHeight={56}
        closeButton={false}
      >
        {/* one owns the safe area, and tamagui's `safe` edge resolves to
            zero on native unless an app wires tamagui's own safe-area setup,
            so the offset past that edge carries one's insets: the top-center
            stack clears the status bar and the home indicator, and the sides
            keep the viewport's default offset */}
        <Toast.Viewport
          portalZIndex={300_000}
          offset={isWeb ? undefined : { top: insets.top, bottom: insets.bottom }}
        >
          <Toast.List
            renderItem={({ toast: currentToast, index }) => (
              <Theme name={(currentToast.type && toastThemes[currentToast.type]) || null}>
                <Toast.Item
                  key={currentToast.id}
                  toast={currentToast}
                  index={index}
                  data-testid="toast"
                  data-toast-id={String(currentToast.id)}
                  bg="transparent"
                  borderWidth={0}
                  rounded={TOAST_RADIUS}
                  borderCurve="continuous"
                  px={0}
                  py={0}
                  boxShadow="0 4px 12px shadow-3"
                  overflow="hidden"
                >
                  <ToastSurface
                    tinted={Boolean(currentToast.type && toastThemes[currentToast.type])}
                  >
                    <ToastContent
                      toast={currentToast}
                      index={index}
                      renderClose={renderClose}
                    />
                  </ToastSurface>
                </Toast.Item>
              </Theme>
            )}
          />
        </Toast.Viewport>
      </Toast>
    </>
  )
}

function isDefaultPrevented(event: unknown): boolean {
  return (
    typeof event === 'object' &&
    event !== null &&
    'defaultPrevented' in event &&
    event.defaultPrevented === true
  )
}

function isToastActionHandler(value: unknown): value is () => void | Promise<void> {
  return typeof value === 'function'
}

function getToastActionHandler(toast: ToastT, key: string) {
  const handler = toast.data?.[key]
  return isToastActionHandler(handler) ? handler : null
}

function ToastContent({
  toast: currentToast,
  index,
  renderClose,
}: {
  toast: ToastT
  index: number
  renderClose?: () => ReactElement
}) {
  const { handleClose } = useToastItem()
  // the glass is translucent, so a collapsed stack would show the cards
  // behind through the front one: only the front card shows its content
  const { expanded } = useToasts()
  const buried = !expanded && index > 0

  const title =
    typeof currentToast.title === 'function' ? currentToast.title() : currentToast.title
  const description =
    typeof currentToast.description === 'function'
      ? currentToast.description()
      : currentToast.description

  const pressAction = (handler: (() => void | Promise<void>) | null, event: unknown) => {
    void handler?.()
    if (!isDefaultPrevented(event)) handleClose()
  }

  const actionHandler = getToastActionHandler(currentToast, TOAST_ACTION_HANDLER_DATA_KEY)
  const cancelHandler = getToastActionHandler(currentToast, TOAST_CANCEL_HANDLER_DATA_KEY)

  return (
    <>
      <XStack
        gap={11}
        items="center"
        px={13}
        py="2-5"
        opacity={buried ? 0 : 1}
        transition="quick"
      >
        <Toast.Icon />
        <YStack flex={1}>
          {title ? (
            <Toast.Title
              fontWeight="600"
              fontSize={13}
              lineHeight="17px"
              color="color"
              // touch dismisses by swiping, so only web draws a close button
              // and keeps the text clear of it
              pr="web:8"
              numberOfLines={currentToast.data?.persist ? undefined : 1}
            >
              {title}
            </Toast.Title>
          ) : null}
          {description ? (
            <Toast.Description
              color="color"
              fontSize={13}
              lineHeight="17px"
              pr="web:8"
              numberOfLines={currentToast.data?.persist ? undefined : 3}
            >
              {description}
            </Toast.Description>
          ) : null}
          {currentToast.action || currentToast.cancel ? (
            <XStack gap={7} mt={13} items="center" justify="flex-end">
              {currentToast.action ? (
                <Button glass size="sm" onPress={(event) => pressAction(actionHandler, event)}>
                  {currentToast.action.label}
                </Button>
              ) : null}
              {currentToast.cancel ? (
                <Button
                  glass
                  size="sm"
                  onPress={(event) => pressAction(cancelHandler, event)}
                >
                  {currentToast.cancel.label}
                </Button>
              ) : null}
            </XStack>
          ) : null}
        </YStack>
      </XStack>
      {!isWeb ? null : renderClose ? (
        <Toast.Close asChild>{renderClose()}</Toast.Close>
      ) : (
        <Toast.Close
          position="absolute"
          t={7}
          r={7}
          width={30}
          height={30}
          items="center"
          justify="center"
          bg="background-hover hover:background-press press:background-press"
          borderWidth={0}
          p={0}
          rounded="full"
          opacity="press:0.5"
          z={1}
        >
          <SizableText size="4" lineHeight="18px" color="color">
            ×
          </SizableText>
        </Toast.Close>
      )}
    </>
  )
}
