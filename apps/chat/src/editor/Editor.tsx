import MDEditor, { type RefMDEditor } from '@uiw/react-md-editor'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

export type EditorProps = {
  initialValue?: string
  onKeyUp?: React.KeyboardEventHandler<HTMLDivElement>
  onSubmit?: (text: string) => void
}

export type EditorRef = RefMDEditor & { clear?: () => void }

export const Editor = forwardRef<EditorRef, EditorProps>(
  ({ onSubmit, onKeyUp, initialValue }, ref) => {
    const editorRef = useRef<RefMDEditor>(null)
    const [value, setValue] = useState(initialValue || '')
    const hasNewLines = value.includes('\n')

    const sendMessage = () => {
      onSubmit?.(value)
      setValue('')
    }

    useImperativeHandle(ref, () => {
      return {
        ...editorRef.current,
        clear() {
          setValue('')
        },
      }
    })

    return (
      <div className="container">
        <MDEditor
          ref={editorRef}
          preview="edit"
          height="100%"
          style={{
            borderRadius: 20,
            paddingLeft: 10,
            paddingRight: 10,
            background: 'var(--background06)',
            backdropFilter: 'blur(50px)',
          }}
          minHeight={38}
          hideToolbar
          visibleDragbar={false}
          toolbarBottom
          value={value}
          onChange={(x) => setValue(x || '')}
          onKeyUp={(e) => {
            onKeyUp?.(e)

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
