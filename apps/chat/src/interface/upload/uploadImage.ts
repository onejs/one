import type React from 'react'
import { useState } from 'react'

interface UploadResponse {
  url?: string
  error?: string
}

export const uploadImageEndpoint = '/api/image/upload'

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

export async function uploadImage(
  imageUrl: string,
  onProgress: (percent: number) => void
): Promise<UploadResponse> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${imageUrl}: ${response.statusText}`)
  }
  const blob = await response.blob()
  return uploadImageData(blob, onProgress)
}

export const useUploadImage = ({ onChangeImage }: { onChangeImage?: (cb: string) => void }) => {
  const [uploadUrl, setUploadUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleUpload = (file: File) => {
    setErrorMessage('')
    setProgress(10)

    uploadImageData(file, (p) => setProgress(p))
      .then((response) => {
        if (response.url) {
          setUploadUrl(response.url)
          onChangeImage?.(response.url)
          setProgress(0)
        } else {
          setErrorMessage('Upload failed: ' + (response.error || 'No error message provided.'))
        }
      })
      .catch((err) => {
        setErrorMessage(err.message)
      })
  }

  return {
    handleUpload,
    handleFileChange,
    progress,
    errorMessage,
    setErrorMessage,
    uploadUrl,
  }
}
