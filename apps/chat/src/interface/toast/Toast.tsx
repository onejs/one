import { ToastProvider as TamaguiToastProvider, ToastViewport } from '@tamagui/toast'
import { Toast, useToastController, useToastState } from '@tamagui/toast'
import { YStack } from 'tamagui'
import type { ToastController, ToastShowOptions } from './types'
import { useState } from 'react'

export type ToastType = 'error' | 'warn' | 'info'

let controller: ToastController = null as any
let toastType: ToastType = 'info'

export const showToast = (
  title: string,
  {
    type = 'info',
    ...options
  }: ToastShowOptions & {
    type?: ToastType
  } = {}
) => {
  controller.show(title, options)
  toastType = type
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
  const nextDuration = currentToast?.duration || 1000
  const [duration, setDuration] = useState(nextDuration)
  if (duration !== nextDuration) {
    setDuration(nextDuration)
  }

  controller = useToastController()

  if (currentToast?.isHandledNatively) {
    return null
  }

  return (
    <Toast
      key={currentToast?.id}
      duration={duration}
      enterStyle={{ opacity: 0, scale: 0.5, y: 0 }}
      exitStyle={{ opacity: 0, scale: 1, y: 0 }}
      y={10}
      opacity={1}
      scale={1}
      animation="slow"
      viewportName={currentToast?.viewportName}
      themeInverse
      bg="$color10"
      theme={toastType === 'error' ? 'red' : toastType === 'warn' ? 'yellow' : null}
    >
      <YStack>
        <Toast.Title color="$color1">{currentToast?.title ?? ''}</Toast.Title>
        {!!currentToast?.message && (
          <Toast.Description color="$color1">{currentToast.message}</Toast.Description>
        )}
      </YStack>
    </Toast>
  )
}
