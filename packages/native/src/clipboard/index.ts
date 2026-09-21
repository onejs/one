import { assertSetStringText } from './validate'

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms.
function webClipboard(): Clipboard | undefined {
  if (typeof navigator === 'undefined') return undefined
  return navigator.clipboard ?? undefined
}

async function getString(): Promise<string> {
  const clipboard = webClipboard()
  if (!clipboard?.readText) return ''
  try {
    return await clipboard.readText()
  } catch {
    return ''
  }
}

function setString(text: string): Promise<boolean> {
  assertSetStringText(text)
  return writeText(text)
}

async function writeText(text: string): Promise<boolean> {
  const clipboard = webClipboard()
  if (!clipboard?.writeText) return false
  try {
    await clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

async function hasString(): Promise<boolean> {
  return (await getString()).length > 0
}

export const Clipboard = Object.freeze({ getString, setString, hasString })
