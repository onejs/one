// the feed entry form: fields and the validity rule, shared by the web
// dialog and the native sheet. each host owns its own chrome and close;
// this owns the fields and nothing else.
import { Field, Form, Section } from '~/interface/ui/forms/Form'
import { useEffect, useState } from 'react'

export type PatternEntryFormState = {
  title: string
  setTitle: (value: string) => void
  note: string
  setNote: (value: string) => void
  valid: boolean
}

export function usePatternEntryForm(initial?: { title: string; note: string }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  // a retarget can change the route's id without remounting (deep link onto
  // the open sheet), so reseed when the record identity changes. the store
  // hands out stable refs, so this never fires mid keystroke.
  useEffect(() => {
    setTitle(initial?.title ?? '')
    setNote(initial?.note ?? '')
  }, [initial])
  return { title, setTitle, note, setNote, valid: title.trim().length > 0 }
}

export function PatternEntryFields({
  form,
  prefix,
}: {
  form: PatternEntryFormState
  prefix: string
}) {
  return (
    <Form presentation="sheet">
      <Section plain>
        <Field
          label="Title"
          value={form.title}
          onChangeText={form.setTitle}
          placeholder="Dinner with Sam"
          testID={`${prefix}-title`}
        />
        <Field
          label="Note"
          value={form.note}
          onChangeText={form.setNote}
          placeholder="What happened"
          testID={`${prefix}-note`}
        />
      </Section>
    </Form>
  )
}
