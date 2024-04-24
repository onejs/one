import type React from 'react'
import * as HelmetAsync from 'react-helmet-async'
// for ssr support:
const { Helmet, HelmetProvider } = HelmetAsync

export const Head: React.FC<{ children?: React.ReactNode }> & {
  Provider: typeof HelmetProvider
} = ({ children }: { children?: any }) => {
  return <Helmet>{children}</Helmet>
}

Head.Provider = HelmetProvider
