import type { ReactNode } from 'react'

export type KeyboardAvoidingFrameProps = {
  children: ReactNode
  enabled: boolean
  keyboardVerticalOffset: number
}

export type KeyboardStickyFrameProps = {
  children: ReactNode
  bottomInset: number
}
