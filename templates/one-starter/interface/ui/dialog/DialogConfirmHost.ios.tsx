import { One } from 'one'
import { useDialogConfirmHost } from './confirmQueue'
import { DialogConfirmDialog } from './DialogConfirmContent'

// the ios leg: a confirm is the system alert, the way ios asks before it
// deletes or signs out. cancel takes the cancel role, so it sits where iOS puts
// it and escape dismisses it, and a destructive confirm takes the destructive
// role, so iOS draws it red. a typed extraConfirm stays the Tamagui dialog,
// because the alert takes no text field. each confirm keys its own alert, so a
// queued one presents fresh after the one before it settles.
export function DialogConfirm() {
  const { state, finish } = useDialogConfirmHost()
  if (state?.props.extraConfirm)
    return <DialogConfirmDialog state={state} finish={finish} />
  const {
    title = 'Are you sure?',
    description = '',
    destructive,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
  } = state?.props ?? {}
  return (
    <One.iOS.Alert
      key={state?.id}
      isPresented={!!state}
      onIsPresentedChange={(presented) => {
        if (!presented) finish(false)
      }}
      title={title}
      message={description}
      actions={[
        { id: 'cancel', label: cancelLabel, role: 'cancel' },
        {
          id: 'confirm',
          label: confirmLabel,
          role: destructive ? 'destructive' : undefined,
        },
      ]}
      onAction={(id) => finish(id === 'confirm')}
    />
  )
}
