import { Toast, useToastController, useToastState } from '@tamagui/toast'
import { YStack } from 'tamagui'

type ToastController = ReturnType<typeof useToastController>
type ToastShowOptions = ToastController['show'] extends (a: any, b: infer B) => any ? B : never

let controller: ToastController = null as any

export const toast = (title: string, options?: ToastShowOptions) => {
  controller.show(title, options)
}

export const hideToast = () => {
  controller.hide()
}

export const ToastDisplay = () => {
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
      y={0}
      opacity={1}
      scale={1}
      animation="100ms"
      viewportName={currentToast.viewportName}
    >
      <YStack>
        <Toast.Title>{currentToast.title}</Toast.Title>
        {!!currentToast.message && <Toast.Description>{currentToast.message}</Toast.Description>}
      </YStack>
    </Toast>
  )
}
