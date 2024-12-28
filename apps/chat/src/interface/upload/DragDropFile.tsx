import { useCallback, useState } from 'react'
import { isWeb } from 'tamagui'
import { type DragDropEvent, useDragDrop } from '~/tauri/useDragDrop'

export const DragDropFile = (props: { children: any }) => {
  if (!isWeb) {
    return props.children
  }

  const [state, setState] = useState<DragDropEvent | null>(null)

  const { createElement } = useDragDrop(
    useCallback(
      (event) => {
        setState(event)
      },
      [setState]
    )
  )

  return createElement(
    <>
      <div
        style={{
          width: '100%',
          height: '100%',
          zIndex: 100_000,
          position: 'absolute',
          pointerEvents: 'none',
          background:
            !state || state.type === 'cancel' || state.type === 'drop'
              ? 'transparent'
              : 'rgba(0,0,0,0.5)',
        }}
      />
      {props.children}
    </>
  )
}
