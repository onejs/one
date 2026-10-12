import { createContext } from 'react'

// slot navigators do not provide this context.
export const IsWithinNativeNavigator = createContext(false)
