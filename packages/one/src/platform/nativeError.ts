// native failures cross nitro as one message, "<code>: <Namespace>.<verb>:
// <detail>". this restores the stable code on the error the caller sees, so
// callers branch on `code` as they did with the bridge modules.
export function rethrowNativeError(error: unknown): never {
  if (error instanceof Error) {
    const coded = /^((?:E|ERR)_[A-Z0-9_]+): ([\s\S]*?)\s*$/.exec(error.message)
    if (coded) {
      error.message = coded[2]
      Object.assign(error, { code: coded[1] })
    }
  }
  throw error
}
