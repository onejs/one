import { HeaderHeightContext } from '@react-navigation/elements'
import { useContext } from 'react'

// native navigators and callers must read the provider's exported context.
export function useHeaderHeight(): number {
  return useContext(HeaderHeightContext) ?? 0
}
