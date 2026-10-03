import { useEffect, useState } from 'react'
// the published module build resolves nitrogen from lib/module instead of the package root.
// use the shipped source entry so vite and metro resolve the generated view config.
import { NativeNitroImage } from 'react-native-nitro-image/src/NativeNitroImage'
import { loadImage } from 'react-native-nitro-image/src/loadImage'
import type { Image as LoadedImage } from 'react-native-nitro-image'
import type { ImageProps as RNImageProps } from 'react-native'

export type ImageProps = Omit<
  RNImageProps,
  'source' | 'resizeMode' | 'onLoad' | 'onError'
> & {
  source: string | number | { uri: string }
  resizeMode?: 'cover' | 'contain' | 'center' | 'stretch'
  recyclingKey?: string
  onLoad?: (event: {
    nativeEvent: { source: { uri: string; width: number; height: number } }
  }) => void
  onError?: (event: { nativeEvent: { error: string } }) => void
}

export function Image({ source, onLoadStart, onLoad, onError, onLoadEnd, ...props }: ImageProps) {
  const uri = typeof source === 'number' ? source : typeof source === 'string' ? source : source.uri
  const [loaded, setLoaded] = useState<{ uri: string | number; image: LoadedImage }>()

  // load in js rather than through a native loader so onLoad and onError report like
  // react native's image does; the view shows nothing until the current source resolves.
  useEffect(() => {
    let cancelled = false
    onLoadStart?.()
    Promise.resolve(loadImage(typeof uri === 'number' ? uri : { url: uri })).then(
      (image) => {
        if (cancelled) return
        setLoaded({ uri, image })
        onLoad?.({
          nativeEvent: { source: { uri: String(uri), width: image.width, height: image.height } },
        })
        onLoadEnd?.()
      },
      (error: unknown) => {
        if (cancelled) return
        onError?.({
          nativeEvent: { error: error instanceof Error ? error.message : String(error) },
        })
        onLoadEnd?.()
      }
    )
    return () => {
      cancelled = true
    }
  }, [uri])

  return <NativeNitroImage image={loaded?.uri === uri ? loaded.image : undefined} {...props} />
}
