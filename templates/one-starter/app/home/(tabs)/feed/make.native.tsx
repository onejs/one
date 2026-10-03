// the feed's create/edit surface on native: the same entry form as the web
// dialog, in the system form sheet the native layout declares. one never
// fires intercepting routes on native, so this file is the whole surface:
// no slot, no transparent modal, and no second implementation to drift.
import { useLocalSearchParams, useRouter } from 'one'
import { getPatternEntry, savePatternEntry } from '~/features/patterns/patternEntries'
import { SheetScreen } from '~/interface/dialogs/SheetScreen'
import { PatternEntryFields, usePatternEntryForm } from '~/interface/patterns/PatternEntryForm'

export default function MakeEntrySheet() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const existing = id ? getPatternEntry(id) : undefined
  const form = usePatternEntryForm(existing)
  return (
    <SheetScreen
      title={existing ? 'Edit entry' : 'New entry'}
      testID="entry-sheet"
      action={{
        label: existing ? 'Save changes' : 'Save entry',
        testID: 'entry-save',
        disabled: !form.valid,
        onPress: () => {
          savePatternEntry({ id, title: form.title.trim(), note: form.note })
          router.back()
        },
      }}
    >
      <PatternEntryFields form={form} prefix="entry" />
    </SheetScreen>
  )
}
