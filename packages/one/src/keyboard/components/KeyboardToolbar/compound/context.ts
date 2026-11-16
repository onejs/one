import { createContext, useContext } from 'react'

import type { KeyboardToolbarTheme } from '../types'

type ToolbarContextType = {
  theme: KeyboardToolbarTheme
  isPrevDisabled: boolean
  isNextDisabled: boolean
}

export const ToolbarContext = createContext<ToolbarContextType | undefined>(undefined)

export const useToolbarContext = () => {
  const context = useContext(ToolbarContext)

  if (!context) {
    throw new Error('KeyboardToolbar.* component must be used inside <KeyboardToolbar>')
  }

  return context
}
