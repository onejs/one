// tracks whether any overlay owner (a menu, a picker, anything that takes over
// pointer focus) is currently open. tooltips suppress themselves while one is,
// and app chrome can pin itself open the same way. lives here so an overlay
// pattern never has to import a specific overlay's module to ask.

import { createEmitter, isEqualIdentity } from '@o/helpers'

export const overlayOpenEmitter = createEmitter<boolean>('overlay-open', false, {
  comparator: isEqualIdentity,
})

const openOverlayOwners = new Set<string>()

export function setOverlayOpen(owner: string, open: boolean) {
  if (open) {
    openOverlayOwners.add(owner)
  } else {
    openOverlayOwners.delete(owner)
  }
  overlayOpenEmitter.emit(openOverlayOwners.size > 0)
}
