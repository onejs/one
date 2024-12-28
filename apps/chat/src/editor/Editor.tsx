import MDEditor, { type RefMDEditor } from '@uiw/react-md-editor'
import { forwardRef, useState } from 'react'

export type EditorProps = {
  initialValue?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>
  onSubmit?: (text: string) => void
}

export const Editor = forwardRef<RefMDEditor, EditorProps>(
  ({ onSubmit, onKeyDown, initialValue }, ref) => {
    const [value, setValue] = useState(initialValue || '')
    const hasNewLines = value.includes('\n')

    const sendMessage = () => {
      onSubmit?.(value)
      setValue('')
    }

    return (
      <div className="container">
        <MDEditor
          ref={ref}
          preview="edit"
          height="100%"
          minHeight={50}
          hideToolbar
          visibleDragbar={false}
          toolbarBottom
          value={value}
          onChange={(x) => setValue(x || '')}
          onKeyDown={(e) => {
            onKeyDown?.(e)

            if (!e.defaultPrevented) {
              if (!hasNewLines && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }

              if (hasNewLines && e.key === 'Enter' && e.metaKey) {
                e.preventDefault()
                sendMessage()
              }
            }
          }}
        />
      </div>
    )
  }
)
