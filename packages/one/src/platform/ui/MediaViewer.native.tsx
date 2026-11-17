import { createContext, useContext, useEffect, useId, useState } from 'react'
import { Platform, Pressable } from 'react-native'
import { QuickLook } from '../generated/Controls.native'
import { ZoomTransitionSource } from '../zoom/index.native'
import type { MediaViewerProps, MediaViewerThumbnailProps } from './mediaViewerTypes'

const Gallery = createContext<{
  sources: string[]
  open: (index: number) => void
} | null>(null)

function Frame({ items, children, onError }: MediaViewerProps) {
  if (Platform.OS !== 'ios') throw new Error('MediaViewer requires iOS')
  const id = useId()
  const [selection, setSelection] = useState<{
    index: number
    items: { url: string; title?: string; sourceIdentifier: string }[]
  } | null>(null)
  useEffect(() => {
    if (!items.length) setSelection(null)
  }, [items.length])
  const nativeItems = items.map((item) => ({
    url: item.url,
    title: item.title,
    sourceIdentifier: `${id}:${item.id ?? item.url}`,
  }))
  const sources = nativeItems.map((item) => item.sourceIdentifier)
  if (new Set(sources).size !== sources.length)
    throw new Error('MediaViewer items need unique ids when URLs repeat')
  if (!items.length) return children
  return (
    <Gallery.Provider
      value={{
        sources,
        open: (index) => setSelection({ index, items: nativeItems }),
      }}
    >
      {children}
      <QuickLook
        items={selection?.items ?? nativeItems}
        initialIndex={selection?.index ?? 0}
        isPresented={selection !== null}
        onIsPresentedChange={(presented) => {
          if (!presented) setSelection(null)
        }}
        onError={onError}
      />
    </Gallery.Provider>
  )
}

function Thumbnail({ index, children, style, ...props }: MediaViewerThumbnailProps) {
  const gallery = useContext(Gallery)
  if (!gallery) throw new Error('MediaViewer.Thumbnail requires a MediaViewer parent')
  if (!Number.isInteger(index) || index < 0 || index >= gallery.sources.length) {
    throw new Error('MediaViewer.Thumbnail index must name an item')
  }
  return (
    <ZoomTransitionSource identifier={gallery.sources[index]} style={style}>
      <Pressable
        accessibilityRole="button"
        {...props}
        collapsable={false}
        style={{ flexGrow: 1, flexShrink: 1 }}
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
