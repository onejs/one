// LabeledContent is a key-value row: the label names it and the content is either a plain
// string value or composed One Native children. React Native props carry scalars, so the
// value travels as a string and the row renders whichever of the two it was given. This
// rejects the other three combinations, which leaves the native branch no ambiguous case.
export function labeledContentProps(props: {
  label: string
  value?: string
  systemImage?: string
  hasChildren: boolean
}) {
  const { label, value, systemImage, hasChildren } = props
  if (typeof label !== 'string' || !label)
    throw new Error('Swift.LabeledContent label must be a non-empty string')
  if (value !== undefined && typeof value !== 'string')
    throw new Error('Swift.LabeledContent value must be a string')
  if (systemImage !== undefined && typeof systemImage !== 'string')
    throw new Error('Swift.LabeledContent systemImage must be a string')
  if (value !== undefined && hasChildren)
    throw new Error('Swift.LabeledContent takes either a value or children')
  if (value === undefined && !hasChildren)
    throw new Error('Swift.LabeledContent needs a value or children')
  return { label, value: value ?? '', systemImage: systemImage ?? '' }
}
