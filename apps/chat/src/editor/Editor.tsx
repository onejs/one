import MDEditor from '@uiw/react-md-editor'
import { useState } from 'react'

export function Editor({
  onSubmit,
  onKeyDown,
}: { onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>; onSubmit?: (text: string) => void }) {
  const [value, setValue] = useState('')
  const hasNewLines = value.includes('\n')

  const sendMessage = () => {
    onSubmit?.(value)
    setValue('')
  }

  return (
    <div className="container">
      <MDEditor
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
