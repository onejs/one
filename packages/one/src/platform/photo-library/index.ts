import type { PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro'

export type { PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro'

const unsupported = (): never => {
  throw new Error('PhotoLibrary requires an iOS native build')
}

export const PhotoLibrary = Object.freeze({
  getAddPermissionStatus: (): PhotoLibraryPermissionStatus => unsupported(),
  requestAddPermission: (): Promise<PhotoLibraryPermissionStatus> => unsupported(),
  saveImage: (_uri: string): Promise<string> => unsupported(),
  saveVideo: (_uri: string): Promise<string> => unsupported(),
})
