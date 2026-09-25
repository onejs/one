import { resolveDocumentPickerOptions } from './options'
import type { DocumentPickerOptions, DocumentPickerResult } from './types'

export type * from './types'

// web entry. the system picker is a file input; signatures stay identical
// to the native entry because the published declarations are built from
// this file and serve both platforms. no browser global is touched at
// import, and on the server a pick behaves as no native side.

// a file dialog has no promise: change resolves with files and the cancel
// event resolves with null.
function pickFiles(accept: string, multiple: boolean): Promise<File[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.onchange = () => resolve(input.files ? [...input.files] : [])
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

// plain, not async, so bad options throw synchronously like the native entry.
function getDocument(options: DocumentPickerOptions = {}): Promise<DocumentPickerResult> {
  const resolved = resolveDocumentPickerOptions(options)
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('DocumentPicker.getDocument needs an iOS or Android build'))
  }
  // '*/*' is not a valid accept token; an empty accept offers every file.
  const accept = resolved.types.includes('*/*') ? '' : resolved.types.join(',')
  return pickFiles(accept, resolved.multiple).then(
    (files): DocumentPickerResult => {
      if (!files || files.length === 0) return { canceled: true, assets: null }
      return {
        canceled: false,
        assets: files.map((file) => ({
          uri: URL.createObjectURL(file),
          name: file.name,
          mimeType: file.type || undefined,
          size: file.size,
        })),
      }
    }
  )
}

export const DocumentPicker = Object.freeze({
  getDocument,
})
