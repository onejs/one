import { createContext } from 'react'

import type { OneRouter } from '../../interfaces/router'

export const InternalLinkPreviewContext = createContext<
  { isVisible: boolean; href: OneRouter.Href } | undefined
>(undefined)
