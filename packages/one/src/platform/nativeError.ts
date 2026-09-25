// native failures cross nitro as one message, "<code>: <Namespace>.<verb>:
// <detail>", and android appends a newline to every rejection. this trims it and
// restores the stable code on the error the caller sees, so callers branch on
// `code` as they did with the bridge modules.
export function rethrowNativeError(error: unknown): never {
  if (error instanceof Error) {
    const message = error.message.trimEnd()
    const coded = /^((?:E|ERR)_[A-Z0-9_]+): ([\s\S]*)$/.exec(message)
    error.message = coded ? coded[2] : message
    if (coded) Object.assign(error, { code: coded[1] })
  }
  throw error
}
