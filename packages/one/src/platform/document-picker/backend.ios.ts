import { FileManager, NSUUID, NSURL, URLResourceKey } from 'one/ios/Foundation'
import { UIApplication, UIDocumentPickerViewController } from 'one/ios/UIKit'
import { UTType } from 'one/ios/UniformTypeIdentifiers'
import type { SDKHandle } from 'one/ios-runtime'
import type { ResolvedDocumentPickerOptions } from './options'
import type { DocumentPickerAsset } from './types'
import type { DocumentPickerNativeResult } from '../specs/OneDocumentPicker.nitro'

let busy = false

function failure(detail: string): Error {
  return Object.assign(new Error(`DocumentPicker.getDocument: ${detail}`), { code: 'E_DOCUMENT_PICKER_FAILED' })
}

function contentType(mime: string): UTType {
  switch (mime) {
    case '*/*': return UTType.item
    case 'image/*': return UTType.image
    case 'video/*': return UTType.movie
    case 'audio/*': return UTType.audio
    case 'text/*': return UTType.text
    case 'font/*': return UTType.font
    default: return mime.endsWith('/*') ? UTType.data : UTType.initMimeTypeConformingTo(mime) ?? UTType.data
  }
}

function cache(uri: string): DocumentPickerAsset {
  const source = NSURL.initString(uri)!
  const scoped = source.startAccessingSecurityScopedResource()
  try {
    const files = FileManager.default
    const caches = NSURL.initString(files.urls('cachesDirectory', ['userDomainMask'])[0])!
    const folder = NSURL.initString(caches.appendingPathComponentIsDirectory('one-native-document-picker', true)!)!
    const directory = NSURL.initString(folder.appendingPathComponentIsDirectory(NSUUID.init().uuidString, true)!)!
    files.createDirectoryAtWithIntermediateDirectoriesAttributes(directory.absoluteString!, true)
    const name = source.lastPathComponent!
    const destination = directory.appendingPathComponent(name)!
    files.moveItemAtTo(uri, destination)
    const copied = NSURL.initString(destination)!
    const nativeType = copied.getResourceValue(URLResourceKey.contentTypeKey).$out.value as SDKHandle | null
    const size = copied.getResourceValue(URLResourceKey.fileSizeKey).$out.value as number | null
    return {
      uri: destination, name,
      mimeType: nativeType ? new UTType(nativeType.$handle).preferredMIMEType ?? undefined : undefined,
      size: size ?? undefined,
    }
  } finally {
    if (scoped) source.stopAccessingSecurityScopedResource()
  }
}

async function getDocument(options: ResolvedDocumentPickerOptions): Promise<DocumentPickerNativeResult> {
  if (busy) throw failure('another request is already in flight')
  busy = true
  try {
    const application = await UIApplication.shared
    const window = await application.keyWindow
    let presenter = window ? await window.rootViewController : null
    while (presenter) {
      const next = await presenter.presentedViewController
      if (!next) break
      presenter = next
    }
    const view = presenter ? await presenter.view : null
    if (!presenter || !view || !await view.window || await application.applicationState !== 'active' ||
      await presenter.isBeingDismissed || await presenter.isBeingPresented || await presenter.transitionCoordinator !== null) {
      throw failure('found no view controller to present from')
    }
    const picker = await UIDocumentPickerViewController.initForOpeningContentTypesAsCopy(options.types.map(contentType), true)
    await picker.setAllowsMultipleSelection(options.multiple)
    return await new Promise<DocumentPickerNativeResult>((resolve, reject) => {
      let finishing = false
      const finish = (uris: string[] | null) => {
        if (finishing) return
        finishing = true
        void (async () => {
          const assets = uris?.length ? uris.map(cache) : undefined
          await new Promise<void>((done, failed) => picker.dismiss(true, done).catch(failed))
          resolve({ canceled: assets === undefined, assets })
        })().catch(reject)
      }
      void picker.setDelegate({
        documentPickerDidPickDocumentsAt: (_picker, uris) => finish(uris),
        documentPickerWasCancelled: () => finish(null),
      }).then(() => presenter.present(picker, true, () => {
        void picker.presentationController.then((presentation) => presentation?.setDelegate({
          presentationControllerDidDismiss: () => finish(null),
        })).catch(reject)
      })).catch(reject)
    })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'E_DOCUMENT_PICKER_FAILED') throw error
    throw failure(error instanceof Error ? error.message : String(error))
  } finally {
    busy = false
  }
}

export function documentPickerNative(_verb: string) {
  return { getDocument }
}
