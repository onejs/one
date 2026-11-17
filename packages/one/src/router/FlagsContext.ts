import { createContext } from 'react'
import type { One } from '../routeTypes'

export const FlagsContext = createContext<One.Flags>({})
