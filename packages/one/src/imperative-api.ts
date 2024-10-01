import * as store from './router/router'
import type { OneRouter } from './interfaces/router'

export const router: OneRouter.Router = {
  navigate: store.navigate,
  push: store.push,
  dismiss: store.dismiss,
  dismissAll: store.dismissAll,
  canDismiss: store.canDismiss,
  replace: store.replace,
  back: store.goBack,
  canGoBack: store.canGoBack,
  setParams: (params) =>
    store.setParams(
      // TODO
      params as any
    ),
  subscribe: store.subscribeToRootState,
  onLoadState: store.subscribeToLoadingState,
}
