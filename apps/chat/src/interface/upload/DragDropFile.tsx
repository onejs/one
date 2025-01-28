import { createPortal } from 'react-dom'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { exists, readFile } from '@tauri-apps/plugin-fs'
import { createEmitter } from '@vxrn/emitter'
import { useCallback, useEffect, useState } from 'react'
import { isWeb, useDidFinishSSR } from 'tamagui'
import { isTauri } from '~/tauri/constants'
import { getFileType, isImageFile } from './helpers'
import { useUploadImages, type FileUpload } from './uploadImage'

export const attachmentEmitter = createEmitter<FileUpload[]>()

export const DragDropFile = (props: { children: any }) => {
  if (!isWeb) {
    return props.children
  }

  const [state, setState] = useState<DragDropEvent | null>(null)
  const [uploading, setUploading] = useState<FileUpload[]>([])
  const isMounted = useDidFinishSSR()

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

  useDragDrop({
    selector: 'body',
    onChange: useCallback(
      (event) => {
        setState(event)
        if (event.type === 'drop') {
          const attachmentFiles = event.files.flatMap(({ name, contents, preview }) => {
            if (!isImageFile(name)) {
              return []
            }
            return {
              file: new File([contents], name),
              type: getFileType(name),
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
    ),
  })

  return (
    <>
      {isMounted &&
        createPortal(
          <div
            style={{
              width: '100%',
              height: '100%',
              zIndex: Number.MAX_SAFE_INTEGER,
              position: 'absolute',
              pointerEvents: 'none',
              background:
                !state || state.type === 'cancel' || state.type === 'drop'
                  ? 'transparent'
                  : 'rgba(0,0,0,0.5)',
            }}
          />,
          document.body
        )}
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

export const useDragDrop = ({
  onChange,
  selector,
}: {
  onChange: (e: DragDropEvent) => void
  selector?: string
}) => {
  const [internalNode, setNode] = useState<HTMLDivElement | null>(null)

  if (isTauri) {
    useEffect(() => {
      let unlisten: Function | null = null

      getCurrentWebview()
        .onDragDropEvent(async (event) => {
          if (event.payload.type === 'over') {
            onChange({
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

            onChange({
              type: 'drop',
              files,
            })
          } else {
            onChange({
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
      const node = selector
        ? (document.querySelector(selector) as HTMLElement | undefined)
        : internalNode

      if (!node) return

      const controller = new AbortController()
      const { signal } = controller

      node.addEventListener(
        'dragover',
        (e) => {
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer!.dropEffect = 'copy'
          onChange({
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
          onChange({
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

          onChange({
            type: 'drop',
            files,
          })
        },
        { signal }
      )

      return () => controller.abort()
    }, [internalNode, onChange, selector])
  }

  return {
    createDropElement: (props?: React.HTMLAttributes<HTMLDivElement>) => {
      return (
        <div
          id="drag-drop-root"
          ref={setNode}
          {...props}
          style={{
            minWidth: '100vw',
            minHeight: '100vh',
            inset: 0,
            pointerEvents: 'auto',
            overflow: 'hidden',
            ...props?.style,
          }}
        />
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

function arrayBufferToDataURL(buffer: Uint8Array, mimeType: string): string {
  const chunkSize = 65536
  let base64 = ''

  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, i + chunkSize)
    base64 += String.fromCharCode(...chunk)
  }

  return `data:${mimeType};base64,${btoa(base64)}`
}
