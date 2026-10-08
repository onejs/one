import { One } from 'one'

// the native setup imports this before the router mounts its first screen.
export const appIconStartupSupport = One.AppIcon.isSupported().then(
  (supported) => String(supported),
  (error: unknown) => `error:${error instanceof Error ? error.message : String(error)}`
)
