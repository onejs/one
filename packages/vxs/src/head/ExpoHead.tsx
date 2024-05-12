import type { ReactNode } from 'react'
import * as HelmetAsync from 'react-helmet-async'

// for ssr support:
const { Helmet, HelmetProvider } = HelmetAsync['default'] || HelmetAsync

export const Head: React.FC<{ children?: ReactNode }> = ({ children }: { children?: any }) => {
  return <Helmet>{children}</Helmet>
}

export const HeadProvider = HelmetProvider
