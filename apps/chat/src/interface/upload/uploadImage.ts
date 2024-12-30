import type React from 'react'
import { useState } from 'react'
import { getFileType, type FileType } from './helpers'

interface UploadResponse {
  url?: string
  error?: string
}

export const uploadImageEndpoint = '/api/image/upload'

export type FileUpload = {
  name: string
  progress: number
  file: File
  type: FileType
  // uploaded url
  url?: string
  // data-uri string
  preview?: string
  error?: string
  status: 'uploading' | 'complete' | 'error'
}

export function uploadImageData(
  fileData: File | Blob,
  onProgress: (percent: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', fileData)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', uploadImageEndpoint)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded * 100) / event.total)
        onProgress(percentage)
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const response: UploadResponse = JSON.parse(xhr.response)
          resolve(response)
        } catch (e) {
          reject(new Error('Failed to parse server response.'))
        }
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Upload error: An error occurred while uploading the file.'))
    }

    xhr.send(formData)
  })
}

export const useUploadImages = ({
  onChange,
}: {
  onChange?: (uploads: FileUpload[]) => void
}) => {
  const [uploads, setUploads] = useState<FileUpload[]>([])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length) {
      handleUpload(files)
    }
  }

  const handleUpload = (files: File[]) => {
    const newUploads = files.map((file) => ({
      name: file.name,
      type: getFileType(file.name),
      file,
      progress: 0,
      status: 'uploading' as const,
    }))

    setUploads((prev) => {
      const next = [...prev, ...newUploads]
      onChange?.(next)
      return next
    })

    const uploadPromises = newUploads.map(async (upload) => {
      try {
        const response = await uploadImageData(upload.file, (progress) => {
          setUploads((prev) => {
            const next = prev.map((u) =>
              u.name === upload.name ? { ...u, progress, status: 'uploading' as const } : u
            )
            onChange?.(next)
            return next
          })
        })

        if (response.url) {
          setUploads((prev) => {
            const next = prev.map((u) =>
              u.name === upload.name ? { ...u, url: response.url, status: 'complete' as const } : u
            )
            onChange?.(next)
            return next
          })
        } else {
          setUploads((prev) => {
            const next = prev.map((u) =>
              u.name === upload.name ? { ...u, error: response.error, status: 'error' as const } : u
            )
            onChange?.(next)
            return next
          })
        }
      } catch (err) {
        setUploads((prev) => {
          const next = prev.map((u) =>
            u.name === upload.name
              ? {
                  ...u,
                  error: err instanceof Error ? err.message : `${err}`,
                  status: 'error' as const,
                }
              : u
          )
          onChange?.(next)
          return next
        })
      }
    })

    return uploadPromises
  }

  return {
    uploads,
    handleUpload,
    handleFileChange,
  }
}
