import { closeOpenTooltips as tgcot } from '@tamagui/tooltip'
import { cancelPendingTooltipClose, globalTooltip, tooltipOwner } from './tooltipBus'

export function closeOpenTooltips() {
  tooltipOwner.current = null
  cancelPendingTooltipClose()
  if (globalTooltip.value !== false) {
    globalTooltip.emit(null)
  }
  tgcot()

  // because oftentimes we click to open a popover just before tooltip opens
  // its never the case we want a tooltip to come in 100ms after we request to close
  setTimeout(() => {
    tgcot()
  }, 100)
}
