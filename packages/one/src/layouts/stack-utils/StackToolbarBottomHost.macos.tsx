import type { ReactNode } from 'react'

import { toolbarChildrenToBottomData } from './stackToolbarDescriptors'

export interface BottomToolbarHostProps {
  children?: ReactNode
  hidden?: boolean
  animated?: boolean
}

// the ios host writes UIKit toolbar items. macos has no bottom toolbar host yet.
export function BottomToolbarHost({ children }: BottomToolbarHostProps) {
  if (toolbarChildrenToBottomData(children).length) {
    throw new Error('Stack.Toolbar with bottom placement has no macOS implementation yet')
  }
  return null
}
