import { Suspense, useEffect, useState } from 'react'

export const SuspenseFallbackLastContents = ({ children }: { children: any }) => {
  const [last, setLast] = useState(children)

  useEffect(() => {
    setLast(children)
  }, [children])

  return <Suspense fallback={last}>{children}</Suspense>
}
