import { createEmitter } from '@vxrn/emitter'
import { useCallback, useState } from 'react'
import { isWeb } from 'tamagui'
import { isImageFile, useDragDrop, type DragDropEvent } from '~/tauri/useDragDrop'
import { useUploadImages, type FileUpload } from './uploadImage'

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
          return {
            ...upload,
            preview: uploading.find((u) => u.file.name === upload.name)?.preview,
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
