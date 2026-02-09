import React, { createContext, useContext, useState, type ReactNode } from 'react'

interface LinkPreviewContextValue {
  openPreviewKey: string | undefined
  setOpenPreviewKey: (key: string | undefined) => void
}

const LinkPreviewContext = createContext<LinkPreviewContextValue>({
  openPreviewKey: undefined,
  setOpenPreviewKey: () => {},
})

export function LinkPreviewProvider({ children }: { children: ReactNode }) {
  const [openPreviewKey, setOpenPreviewKey] = useState<string | undefined>(undefined)

  return (
    <LinkPreviewContext.Provider value={{ openPreviewKey, setOpenPreviewKey }}>
      {children}
    </LinkPreviewContext.Provider>
  )
}

export function useLinkPreviewContext() {
  return useContext(LinkPreviewContext)
}
