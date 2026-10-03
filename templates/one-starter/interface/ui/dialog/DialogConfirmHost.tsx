import { useDialogConfirmHost } from './confirmQueue'
import { DialogConfirmDialog } from './DialogConfirmContent'

export function DialogConfirm() {
  const { state, finish } = useDialogConfirmHost()
  return <DialogConfirmDialog state={state} finish={finish} />
}
