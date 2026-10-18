import { CharacterSet, FileManager, NSError, NSString, NSURL } from 'one/ios/Foundation'
import { UIApplication, UIActivityViewController } from 'one/ios/UIKit'
import type { ShareItem, ShareResult } from '../specs/OneShare.nitro'

let busy = false

function failure(code: string, detail: string): Error {
  return Object.assign(new Error(`Share.share: ${detail}`), { code: `E_SHARE_${code}` })
}

function values(items: ShareItem[]): unknown[] {
  if (!items.length) throw failure('ITEMS', 'at least one item is required')
  return items.map((item) => {
    if (item.type === 'text') {
      if (!NSString.initString(item.value).trimmingCharacters(CharacterSet.whitespacesAndNewlines)) {
        throw failure('ITEMS', 'text cannot be empty')
      }
      return item.value
    }
    const url = NSURL.initString(item.value)
    if (!url || (item.type === 'url' ? !url.scheme || url.isFileURL :
      !url.isFileURL || (url.host !== null && url.host !== '' && url.host !== 'localhost') ||
      url.query !== null || url.fragment !== null)) {
      throw failure('URL', 'the item needs an absolute URL of its declared type')
    }
    if (item.type === 'url') return url
    const file = FileManager.default.fileExistsAtPathIsDirectory(url.path ?? '')
    if (!file.$ret || file.$out.isDirectory) {
      throw failure('FILE', 'the file does not exist or is a directory')
    }
    return NSURL.initString(url.standardized!)
  })
}

async function share(items: ShareItem[]): Promise<ShareResult> {
  if (busy) throw failure('BUSY', 'a share sheet is already open')
  busy = true
  try {
    const activityItems = values(items)
    const application = await UIApplication.shared
    const window = await application.keyWindow
    let presenter = window ? await window.rootViewController : null
    while (presenter) {
      const next = await presenter.presentedViewController
      if (!next) break
      presenter = next
    }
    const view = presenter ? await presenter.view : null
    if (!presenter || !view || !await view.window ||
      await application.applicationState !== 'active' || await presenter.isBeingDismissed ||
      await presenter.isBeingPresented || await presenter.transitionCoordinator !== null) {
      throw failure('PRESENTATION', 'there is no active view controller to present from')
    }
    const controller = UIActivityViewController.initActivityItemsApplicationActivities(activityItems)
    const popover = await controller.popoverPresentationController
    if (popover) {
      await popover.setSourceView(view)
      const bounds = await view.bounds
      await popover.setSourceRect({x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, width: 1, height: 1})
    }
    return await new Promise<ShareResult>((resolve, reject) => {
      let settled = false
      let finishing = false
      let timer: ReturnType<typeof setTimeout> | undefined
      const rejectOnce = (error: unknown) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(error)
      }
      controller.completionWithItemsHandler = (activityType, completed, _items, error) => {
        void (async () => {
          if (settled || finishing || (!completed && activityType !== null && await controller.presentingViewController !== null)) return
          finishing = true
          // settle only after dismissal, so the next share can present immediately.
          await new Promise<void>((done, failed) => {
            controller.dismiss(true, done).catch(failed)
          })
          if (settled) return
          settled = true
          clearTimeout(timer)
          if (error) reject(failure('FAILED', new NSError(error.$handle).localizedDescription))
          else resolve({ completed, activityType: activityType ?? undefined })
        })().catch(rejectOnce)
      }
      void presenter.present(controller, true).then(() => {
        if (settled) return
        timer = setTimeout(() => {
          void controller.presentingViewController.then((attached) => {
            if (!attached) rejectOnce(failure('PRESENTATION', 'there is no active view controller to present from'))
          }).catch(rejectOnce)
        }, 1000)
      }).catch(rejectOnce)
    })
  } finally {
    busy = false
  }
}

export function shareNative() {
  return { share }
}
