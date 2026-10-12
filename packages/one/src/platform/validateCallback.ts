export function validateCallback(callback: unknown, message: string): void {
  if (typeof callback !== 'function') throw new TypeError(message)
}
