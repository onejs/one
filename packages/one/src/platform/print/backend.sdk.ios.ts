import { FileManager, NSError, NSURL } from 'one/ios/Foundation'
import { PDFDocument } from 'one/ios/PDFKit'
import { UIApplication, UIPrintInfo, UIPrintInteractionController } from 'one/ios/UIKit'
import type { PrintResult } from '../specs/OnePrint.nitro'

let busy = false

function failure(code: string, detail: string): Error {
  return Object.assign(new Error(`Print.printPdf: ${detail}`), { code: `E_PRINT_${code}` })
}

async function isAvailable(): Promise<boolean> {
  return UIPrintInteractionController.isPrintingAvailable
}

async function printPdf(fileUri: string, jobName?: string): Promise<PrintResult> {
  if (busy) throw failure('BUSY', 'a print sheet is already open')
  busy = true
  try {
    if (jobName === '') throw failure('INPUT', 'jobName must be non-empty')
    if (!await isAvailable()) throw failure('UNAVAILABLE', 'printing is unavailable')
    const url = NSURL.initString(fileUri)
    if (!url || !url.isFileURL || (url.host !== null && url.host !== '' && url.host !== 'localhost') ||
      url.query !== null || url.fragment !== null) {
      throw failure('URI', 'a local file:// URI is required')
    }
    const file = FileManager.default.fileExistsAtPathIsDirectory(url.path ?? '')
    if (!file.$ret || file.$out.isDirectory) throw failure('FILE', 'PDF file does not exist')
    const document = PDFDocument.initUrl(fileUri)
    if (!document || document.pageCount < 1) throw failure('PDF', 'file is not a nonempty PDF')
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
      throw failure('PRESENTATION', 'no active view controller')
    }
    const controller = await UIPrintInteractionController.shared
    const info = await UIPrintInfo.initDictionary()
    await info.setOutputType('general')
    await info.setJobName(jobName ?? NSURL.initString(url.deletingPathExtension!)!.lastPathComponent!)
    await controller.setPrintInfo(info)
    await controller.setPrintingItem(url)
    try {
      return await new Promise<PrintResult>((resolve, reject) => {
        let finished = false
        void controller.presentAnimatedCompletionHandler(true, (_controller, completed, error) => {
          if (finished) return
          finished = true
          if (error) reject(failure('FAILED', new NSError(error.$handle).localizedDescription))
          else resolve({ completed })
        }).then((presented) => {
          if (finished || presented) return
          finished = true
          reject(failure('PRESENTATION', 'system print sheet did not open'))
        }).catch((error) => {
          if (finished) return
          finished = true
          reject(error)
        })
      })
    } finally {
      await controller.setPrintingItem(null)
    }
  } finally {
    busy = false
  }
}

export function printNative() {
  return { isAvailable, printPdf }
}
