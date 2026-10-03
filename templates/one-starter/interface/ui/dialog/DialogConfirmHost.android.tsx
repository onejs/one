import { One } from 'one'
import { useDialogConfirmHost } from './confirmQueue'
import { DialogConfirmDialog } from './DialogConfirmContent'

// the android leg: a confirm is the Material alert dialog. the dismiss button,
// an outside tap and the back button all answer no; the confirm button answers
// yes. Material draws both buttons as text buttons with no destructive role, so
// `destructive` changes nothing here. a typed extraConfirm stays the Tamagui
// dialog, because the alert takes no text field. each confirm mounts its own
// node, so a late event from a settled one reaches no handler and a queued one
// presents fresh after the one before it settles.
export function DialogConfirm() {
  const { state, finish } = useDialogConfirmHost()
  if (!state) return null
  if (state.props.extraConfirm)
    return <DialogConfirmDialog state={state} finish={finish} />
  const {
    title = 'Are you sure?',
    description = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
  } = state.props
  return (
    <One.Android.AlertDialog
      key={state.id}
      visible
      title={title}
      message={description}
      confirmLabel={confirmLabel}
      dismissLabel={cancelLabel}
      onConfirm={() => finish(true)}
      onDismiss={() => finish(false)}
    />
  )
}
