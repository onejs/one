export function getFileType(filename: string) {
  const ext = filename.toLowerCase().split('.').pop()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg' as const
    case 'png':
      return 'image/png' as const
    case 'gif':
      return 'image/gif' as const
    case 'webp':
      return 'image/webp' as const
    default:
      return 'application/octet-stream' as const
  }
}

export type FileType = ReturnType<typeof getFileType>

export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
}
