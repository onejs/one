import type { MediaViewerProps, MediaViewerThumbnailProps } from './mediaViewerTypes'

function Frame(_props: MediaViewerProps): never {
  throw new Error('MediaViewer requires an iOS native build')
}
function Thumbnail(_props: MediaViewerThumbnailProps): never {
  throw new Error('MediaViewer requires an iOS native build')
}
export const MediaViewer = Object.assign(Frame, { Thumbnail })
export type {
  MediaViewerItem,
  MediaViewerProps,
  MediaViewerThumbnailProps,
} from './mediaViewerTypes'
