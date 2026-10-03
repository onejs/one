import { isWeb } from 'tamagui'
import { nativeBearerToken } from '~/auth/client/authClient'
import { SERVER_URL } from '~/constants'

interface UploadResult {
  url: string
}

type NativeUploadFile = {
  uri: string
  name: string
  type: string
  size?: number
  lastModified?: number
}

// both platforms post to the same endpoint — the only platform difference is
// how the body is built (web resizes via canvas first; native hands the
// picker uri straight to FormData). the returned url is a real stored
// object url, never a data url: posts are synced Zero rows and inlining
// image bytes there would balloon every client's replica.
export async function uploadFile(file: File | NativeUploadFile): Promise<UploadResult> {
  if (!isWeb && 'uri' in file) {
    return postUpload({ uri: file.uri, name: file.name, type: file.type })
  }
  const webFile = file as File
  const resized = await fileToResizedJpeg(webFile, 1280, 0.85)
  return postUpload(resized)
}

async function postUpload(file: Blob | { uri: string; name: string; type: string }) {
  const formData = new FormData()
  if (file instanceof Blob) {
    formData.append('file', file, 'upload.jpg')
  } else {
    // react-native's FormData accepts a { uri, name, type } descriptor at
    // runtime but the DOM types only know Blob — boundary assertion
    formData.append('file', file as unknown as Blob)
  }

  const response = await fetch(`${SERVER_URL}/api/file/upload`, {
    method: 'POST',
    body: formData,
    headers: isWeb ? undefined : { Authorization: `Bearer ${nativeBearerToken.get() || ''}` },
  })

  const result = await response.json()
  if (!response.ok || !result?.url) {
    throw new Error(result?.error || 'Upload failed')
  }

  return { url: result.url as string }
}

async function fileToResizedJpeg(file: File, maxDim: number, quality: number): Promise<Blob> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('decode failed'))
    image.src = original
  })

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  if (scale === 1 && file.type === 'image/jpeg') {
    return file
  }

  const out = document.createElement('canvas')
  out.width = Math.round(img.width * scale)
  out.height = Math.round(img.height * scale)
  const ctx = out.getContext('2d')
  if (!ctx) {
    throw new Error('canvas unavailable')
  }
  ctx.drawImage(img, 0, 0, out.width, out.height)
  return await new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
      'image/jpeg',
      quality,
    )
  })
}
