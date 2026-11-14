let ready: (() => void) | undefined
export function waitForNavigation() {
  return new Promise<void>(resolve => { ready = resolve })
}
export function navigationReady() { ready?.(); ready = undefined }
