import { getCurrentWebview } from '@tauri-apps/api/webview'
import { exists, readFile } from '@tauri-apps/plugin-fs'
import { useEffect } from 'react'
import { isTauri } from './constants'

export type DropFile = {
  path: string
  contents: Uint8Array<ArrayBufferLike>
}

export type DragDropEvent =
  | {
      type: 'drag'
      x: number
      y: number
    }
  | {
      type: 'drop'
      files: DropFile[]
    }
  | {
      type: 'cancel'
    }

export const useDragDrop = (callback: (e: DragDropEvent) => void) => {
  if (!isTauri) {
    return
  }

  useEffect(() => {
    let unlisten: Function | null = null

    getCurrentWebview()
      .onDragDropEvent(async (event) => {
        if (event.payload.type === 'over') {
          callback({
            ...event.payload.position,
            type: 'drag',
          })
        } else if (event.payload.type === 'drop') {
          const paths = event.payload.paths
          const files = (
            await Promise.all(
              paths.flatMap(async (path) => {
                if (await exists(path)) {
                  return [
                    {
                      path,
                      contents: await readFile(path),
                    } satisfies DropFile,
                  ]
                }

                return []
              })
            )
          ).flat()

          callback({
            type: 'drop',
            files,
          })
        } else {
          callback({
            type: 'cancel',
          })
        }
      })
      .then((disposer) => {
        unlisten = disposer
      })

    return () => {
      unlisten?.()
    }
  }, [])
}
