// shared argument checks: identical checks and messages on web and native.
export function assertSetStringText(text: unknown): asserts text is string {
  if (typeof text !== 'string') {
    throw new Error('Clipboard.setString: text must be a string')
  }
}
