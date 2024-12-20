import { useState } from 'react'
import { type DragDropEvent, useDragDrop } from '~/tauri/useDragDrop'

export const DragDropFile = (props: { children: any }) => {
  const [state, setState] = useState<DragDropEvent | null>(null)

  useDragDrop((event) => {
    setState(event)
  })

  return (
    <div id="drag-drop-root" style={{ display: 'contents' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          zIndex: 100_000,
          position: 'absolute',
          pointerEvents: 'none',
          background: !state || state.type === 'cancel' ? 'transparent' : 'rgba(0,0,0,0.5)',
        }}
      />
      {props.children}
    </div>
  )
}
