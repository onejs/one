// the feed's create/edit surface on web: one dialog, and the only
// implementation of it. the @sheet slot re-exports this file, so a soft
// navigation renders it as the intercept overlay; the stack declares `make`
// as a transparent modal with no modal chrome provider, so a hard navigation
// (refresh, deep link) seats the feed and renders this same file raw over it.
// one component, identical header, buttons, spacing, and backdrop in every
// context. native resolves make.native.tsx instead: the system form sheet.
import { Dialog } from '~/interface/ui/dialog/Dialog'
import { closeIntercept, useLocalSearchParams, useRouter } from 'one'
import { getPatternEntry, savePatternEntry } from '~/features/patterns/patternEntries'
import { Button } from '~/interface/buttons/Button'
import { PatternEntryFields, usePatternEntryForm } from '~/interface/patterns/PatternEntryForm'

export default function MakeEntryDialog() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const existing = id ? getPatternEntry(id) : undefined
  const form = usePatternEntryForm(existing)
  const dismiss = () => {
    if (!closeIntercept()) router.back()
  }
  return (
    <Dialog
      size="medium"
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismiss()
      }}
      contentTestId="entry-dialog"
    >
      <Dialog.Header title={existing ? 'Edit entry' : 'New entry'} />
      <Dialog.Body>
        <PatternEntryFields form={form} prefix="entry-dialog" />
      </Dialog.Body>
      <Dialog.Footer>
        <Button onPress={dismiss}>Cancel</Button>
        <Button
          accent
          disabled={!form.valid}
          onPress={() => {
            savePatternEntry({ id, title: form.title.trim(), note: form.note })
            dismiss()
          }}
          testID="entry-dialog-save"
        >
          {existing ? 'Save changes' : 'Save entry'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
