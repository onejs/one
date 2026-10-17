// the splash facts the native resources do not carry, injected as one define
// by one/vite. the literal member expression is what vite's define replaces.
export type LaunchScreenConfig = {
  width: number
  cover: boolean
  backgroundImage: boolean
}

export function readLaunchScreenConfig(): LaunchScreenConfig | null {
  const raw = process.env.ONE_LAUNCH_SCREEN
  return typeof raw === 'string' && raw !== '' ? JSON.parse(raw) : null
}
