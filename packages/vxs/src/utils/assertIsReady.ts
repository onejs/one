import type { VXSRouter } from '../interfaces/router'

export function assertIsReady(navigationRef: VXSRouter.NavigationRef) {
  if (!navigationRef.isReady()) {
    throw new Error(
      'Attempted to navigate before mounting the Root Layout component. Ensure the Root Layout component is rendering a Slot, or other navigator on the first render.'
    )
  }
}
