/**
 * Functions in this file are copied from Vite `packages/vite/src/node/utils.ts`.
 * Changes are marked with `// vxrn`.
 * Note that not all functions are copied.
 */

export function displayTime(time: number): string {
  // display: {X}ms
  if (time < 1000) {
    return `${time}ms`
  }

  time = time / 1000

  // display: {X}s
  if (time < 60) {
    return `${time.toFixed(2)}s`
  }

  // biome-ignore lint/style/useNumberNamespace: this code is copied from Vite
  const mins = parseInt((time / 60).toString())
  const seconds = time % 60

  // display: {X}m {Y}s
  return `${mins}m${seconds < 1 ? '' : ` ${seconds.toFixed(0)}s`}`
}
