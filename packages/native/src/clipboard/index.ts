// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms.
function webClipboard(): Clipboard | undefined {
  if (typeof navigator === 'undefined') return undefined
  return navigator.clipboard ?? undefined
}

export async function getStringAsync(): Promise<string> {
  const clipboard = webClipboard()
  if (!clipboard?.readText) return ''
  try {
    return await clipboard.readText()
  } catch {
    return ''
  }
}

export async function setStringAsync(text: string): Promise<boolean> {
  const clipboard = webClipboard()
  if (!clipboard?.writeText) return false
  try {
    await clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export async function hasStringAsync(): Promise<boolean> {
  return (await getStringAsync()).length > 0
}
