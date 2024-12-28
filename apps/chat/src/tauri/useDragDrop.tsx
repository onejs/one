import { getCurrentWebview } from '@tauri-apps/api/webview'
import { exists, readFile } from '@tauri-apps/plugin-fs'
import { useEffect, useState } from 'react'
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
  const [node, setNode] = useState<HTMLDivElement | null>(null)

  if (isTauri) {
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
  } else {
    useEffect(() => {
      if (!node) return
      const controller = new AbortController()
      const { signal } = controller

      node.addEventListener(
        'dragover',
        (e) => {
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer!.dropEffect = 'copy'
          callback({
            type: 'drag',
            x: e.clientX,
            y: e.clientY,
          })
        },
        { signal }
      )

      node.addEventListener(
        'dragleave',
        (e) => {
          e.preventDefault()
          e.stopPropagation()
          callback({
            type: 'cancel',
          })
        },
        { signal }
      )

      node.addEventListener(
        'drop',
        async (e) => {
          e.preventDefault()
          e.stopPropagation()

          const files: DropFile[] = []

          for (const item of Array.from(e.dataTransfer!.files)) {
            try {
              const contents = new Uint8Array(await item.arrayBuffer())
              files.push({
                path: item.name,
                contents,
              })
            } catch (err) {
              console.error('Failed to read dropped file:', err)
            }
          }

          callback({
            type: 'drop',
            files,
          })
        },
        { signal }
      )

      return () => controller.abort()
    }, [node, callback])
  }

  return {
    createElement: (children: any) => {
      return (
        <div
          id="drag-drop-root"
          ref={setNode}
          style={{
            minWidth: '100vw',
            minHeight: '100vh',
            inset: 0,
            pointerEvents: 'auto',
          }}
        >
          {children}
        </div>
      )
    },
  }
}
