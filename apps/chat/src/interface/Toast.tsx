import { ToastProvider as TamaguiToastProvider, ToastViewport } from '@tamagui/toast'
import { Toast, useToastController, useToastState } from '@tamagui/toast'
import { YStack } from 'tamagui'

type ToastController = ReturnType<typeof useToastController>
type ToastShowOptions = ToastController['show'] extends (a: any, b: infer B) => any ? B : never

let controller: ToastController = null as any

export const showToast = (title: string, options?: ToastShowOptions) => {
  controller.show(title, options)
}

export const hideToast = () => {
  controller.hide()
}

export const ToastProvider = ({ children }: { children: any }) => {
  return (
    <TamaguiToastProvider swipeDirection="horizontal">
      <ToastDisplay />
      <ToastViewport flexDirection="column-reverse" top={0} left={0} right={0} mx="auto" />
      {children}
    </TamaguiToastProvider>
  )
}

const ToastDisplay = () => {
  const currentToast = useToastState()

  controller = useToastController()

  if (!currentToast || currentToast.isHandledNatively) {
    return null
  }

  return (
    <Toast
      key={currentToast.id}
      duration={currentToast.duration}
      enterStyle={{ opacity: 0, scale: 0.5, y: -25 }}
      exitStyle={{ opacity: 0, scale: 1, y: -20 }}
      y={10}
      opacity={1}
      scale={1}
      animation="100ms"
      viewportName={currentToast.viewportName}
      themeInverse
      bg="$color12"
    >
      <YStack>
        <Toast.Title color="$color1">{currentToast.title}</Toast.Title>
        {!!currentToast.message && (
          <Toast.Description color="$color1">{currentToast.message}</Toast.Description>
        )}
      </YStack>
    </Toast>
  )
}
