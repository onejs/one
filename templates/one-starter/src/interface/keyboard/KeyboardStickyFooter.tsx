import { YStack } from 'tamagui'
import type { ReactNode } from 'react'

// web version - just a bit of padding

export interface KeyboardStickyFooterProps {
  children: ReactNode
  offset?: number
  openedOffset?: number
}
export const KeyboardStickyFooter = ({ children, offset }: KeyboardStickyFooterProps) => {
  return (
    <YStack
      maxW={500}
      self="center"
      pt="8"
      pb="4"
      style={{
        paddingBottom: offset,
      }}
    >
      {children}
    </YStack>
  )
}
