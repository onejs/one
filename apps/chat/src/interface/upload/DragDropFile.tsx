import { getCurrentWebview } from '@tauri-apps/api/webview'
import { exists, readFile } from '@tauri-apps/plugin-fs'
import { createEmitter } from '@vxrn/emitter'
import { useCallback, useEffect, useState } from 'react'
import { isWeb } from 'tamagui'
import { useUploadImages, type FileUpload } from './uploadImage'
import { isTauri } from '~/tauri/constants'

export const attachmentEmitter = createEmitter<FileUpload[]>()

export const DragDropFile = (props: { children: any }) => {
  if (!isWeb) {
    return props.children
  }

  const [state, setState] = useState<DragDropEvent | null>(null)
  const [uploading, setUploading] = useState<FileUpload[]>([])

  const { handleUpload } = useUploadImages({
    onChange: (uploads) => {
      attachmentEmitter.emit(
        uploads.map((upload) => {
          if (upload.status === 'complete') {
            return upload
          }
          const preview = uploading.find((u) => u.file.name === upload.name)?.preview
          return {
            ...upload,
            preview,
          }
        })
      )
    },
  })

  const { createElement } = useDragDrop(
    useCallback(
      (event) => {
        setState(event)
        if (event.type === 'drop') {
          const attachmentFiles = event.files.flatMap(({ name, contents, preview }) => {
            if (!isImageFile(name)) {
              return []
            }
            return {
              file: new File([contents], name),
              name,
              progress: 0,
              status: 'uploading' as const,
              preview,
            }
          })
          setUploading(attachmentFiles)
          attachmentEmitter.emit(attachmentFiles)
          handleUpload(attachmentFiles.map((f) => f.file))
        }
      },
      [setState, handleUpload]
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

export type DropFile = {
  name: string
  contents: Uint8Array<ArrayBufferLike>
  preview?: string
}

export type DropEvent = {
  type: 'drop'
  files: DropFile[]
}

export type DragDropEvent =
  | {
      type: 'drag'
      x: number
      y: number
    }
  | DropEvent
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
                paths.flatMap(async (name) => {
                  if (await exists(name)) {
                    const contents = await readFile(name)
                    return [
                      {
                        name,
                        contents,
                        preview: await fileLikeToDataURI({ name, contents }),
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
              files.push({
                name: item.name,
                contents: new Uint8Array(await item.arrayBuffer()),
                preview: await fileLikeToDataURI(item),
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

async function fileLikeToDataURI(
  file: File | { name: string; contents: Uint8Array<ArrayBufferLike> }
) {
  const contents = 'contents' in file ? file.contents : new Uint8Array(await file.arrayBuffer())
  return arrayBufferToDataURL(contents, getFileType(file.name))
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
}

function getFileType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

function arrayBufferToDataURL(buffer: Uint8Array, mimeType: string): string {
  const chunkSize = 65536
  let base64 = ''

  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, i + chunkSize)
    base64 += String.fromCharCode(...chunk)
  }

  return `data:${mimeType};base64,${btoa(base64)}`
}
