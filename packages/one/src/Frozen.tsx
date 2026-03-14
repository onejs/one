import { type ReactNode } from 'react'
import { FrozeContext } from './hooks'

export function Frozen({ on = false, children }: { on?: boolean; children: ReactNode }) {
  // render same structure on server and client to avoid hydration mismatch
  return (
    <FrozeContext.Provider value={on}>
      <div {...(on && { inert: true })} style={{ display: 'contents' }}>
        {children}
      </div>
    </FrozeContext.Provider>
  )
}
