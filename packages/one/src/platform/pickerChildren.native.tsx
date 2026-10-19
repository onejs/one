import { Children, isValidElement, type ReactElement } from 'react'
import { Picker as GeneratedPicker, Text } from './generated/Controls.native'
import { assertOneNativeChildren } from './containerChildren'
import type { PickerWithChildrenProps } from './pickerChildren'

// an option is a Text view whose swiftStyle tag is its value, so the adapter
// keeps anything else out with a javascript stack before Fabric ever mounts
// it. the native insertChild preconditions as the backstop.
export function Picker({ children, selection, ...props }: PickerWithChildrenProps): ReactElement {
  assertOneNativeChildren(children, 'One.iOS.Picker')
  const tags: string[] = []
  for (const child of Children.toArray(children)) {
    if (child === null || child === undefined || typeof child === 'boolean') continue
    if (!isValidElement(child) || child.type !== Text)
      throw new Error('One.iOS.Picker accepts One.iOS.Text elements as direct children')
    const tag = (child.props as { swiftStyle?: { tag?: unknown } }).swiftStyle?.tag
    if (typeof tag !== 'string')
      throw new Error('One.iOS.Picker option text must set swiftStyle.tag to a string value')
    tags.push(tag)
  }
  if (!tags.length) throw new Error('One.iOS.Picker requires at least one One.iOS.Text child')
  if (new Set(tags).size !== tags.length)
    throw new Error('One.iOS.Picker option tags must be unique')
  if (!tags.includes(selection))
    throw new Error('One.iOS.Picker selection must match an option tag')
  // the generated adapter forwards the rest props, children included, to the
  // native view; the cast only widens its props to name the slot.
  const NativePicker = GeneratedPicker as (props: PickerWithChildrenProps) => ReactElement
  return (
    <NativePicker selection={selection} {...props}>
      {children}
    </NativePicker>
  )
}
