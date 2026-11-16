import { createContext, useContext, useId, useState } from 'react'
import { Platform, Pressable } from 'react-native'
import { QuickLook } from '../generated/Controls.native'
import { ZoomTransitionSource } from '../zoom/index.native'
import type { MediaViewerProps, MediaViewerThumbnailProps } from './mediaViewerTypes'

const Gallery = createContext<{
  id: string
  count: number
  open: (index: number) => void
} | null>(null)

function Frame({ items, children, onError }: MediaViewerProps) {
  if (Platform.OS !== 'ios') throw new Error('MediaViewer requires iOS')
  const id = useId()
  const [selection, setSelection] = useState<number | null>(null)
  if (!items.length) return children
  return (
    <Gallery.Provider value={{ id, count: items.length, open: setSelection }}>
      {children}
      <QuickLook
        items={items.map((item, index) => ({
          ...item,
          sourceIdentifier: `${id}:${index}`,
        }))}
        initialIndex={selection ?? 0}
        isPresented={selection !== null}
        onIsPresentedChange={(presented) => {
          if (!presented) setSelection(null)
        }}
        onError={onError}
      />
    </Gallery.Provider>
  )
}

function Thumbnail({ index, children, ...props }: MediaViewerThumbnailProps) {
  const gallery = useContext(Gallery)
  if (!gallery) throw new Error('MediaViewer.Thumbnail requires a MediaViewer parent')
  if (!Number.isInteger(index) || index < 0 || index >= gallery.count) {
    throw new Error('MediaViewer.Thumbnail index must name an item')
  }
  return (
    <ZoomTransitionSource identifier={`${gallery.id}:${index}`}>
      <Pressable
        accessibilityRole="button"
        {...props}
        collapsable={false}
        onPress={() => gallery.open(index)}
      >
        {children}
      </Pressable>
    </ZoomTransitionSource>
  )
}

export const MediaViewer = Object.assign(Frame, { Thumbnail })
export type {
  MediaViewerItem,
  MediaViewerProps,
  MediaViewerThumbnailProps,
} from './mediaViewerTypes'
