import { forwardRef, useEffect, useState } from 'react'
import { ListItem, type ListItemProps } from './ListItem'

export type EditableListItemProps = Omit<ListItemProps, 'editing'> & {
  defaultEditing?: boolean
}

export const EditableListItem = forwardRef(
  (
    { onPress, onEditCancel, onEditComplete, defaultEditing, ...rest }: EditableListItemProps,
    ref: any
  ) => {
    const [editing, setEditing] = useState(defaultEditing)

    useEffect(() => {
      setEditing(defaultEditing)
    }, [defaultEditing])

    return (
      <ListItem
        ref={ref}
        onPress={(e) => {
          // avoid triggering press on editing
          if (editing) return
          onPress?.(e)
        }}
        onEditCancel={() => {
          if (editing) {
            setEditing(false)
          }
          onEditCancel?.()
        }}
        onEditComplete={(next) => {
          if (editing) {
            onEditComplete?.(next)
            setEditing(false)
          }
        }}
        // @ts-expect-error
        onDoubleClick={() => {
          if (editing) {
            return
          }
          setEditing(!editing)
        }}
        {...rest}
        // control this
        editing={editing}
      />
    )
  }
)
