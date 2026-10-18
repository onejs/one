import { AppStore } from 'one/ios/StoreKit'
import { UIApplication } from 'one/ios/UIKit'

async function requestReview(): Promise<void> {
  const application = await UIApplication.shared
  const window = await application.keyWindow
  let presenter = window ? await window.rootViewController : null
  while (presenter) {
    const presented = await presenter.presentedViewController
    if (!presented) break
    presenter = presented
  }
  const view = presenter ? await presenter.view : null
  const attachedWindow = view ? await view.window : null
  const scene = attachedWindow ? await attachedWindow.windowScene : null
  if (!scene || !presenter || await application.applicationState !== 'active' ||
      await presenter.isBeingDismissed || await presenter.isBeingPresented ||
      await presenter.transitionCoordinator !== null) {
    throw Object.assign(new Error('StoreReview.requestReview: no active window scene'), {
      code: 'E_STORE_REVIEW_SCENE',
    })
  }
  await AppStore.requestReview(scene)
}

export function storeReviewNative() {
  return { requestReview }
}
