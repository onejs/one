import { createContext, useContext } from 'react'

const PreviewRouteContext = createContext<boolean>(false)

export const PreviewRouteProvider = PreviewRouteContext.Provider

export function useIsPreview(): boolean {
  return useContext(PreviewRouteContext)
}
