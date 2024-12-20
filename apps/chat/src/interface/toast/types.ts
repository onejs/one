import type { useToastController } from '@tamagui/toast'

export type ToastController = ReturnType<typeof useToastController>
export type ToastShowOptions = ToastController['show'] extends (a: any, b: infer B) => any
  ? B
  : never
