import { useEffect } from 'react'
import { domStyle } from '../web/DomView'
import type { ImageProps } from './Image.native'

const OBJECT_FIT = {
  cover: 'cover',
  contain: 'contain',
  center: 'none',
  stretch: 'fill',
} as const

function webUri(source: ImageProps['source']) {
  if (typeof source === 'number') {
    throw new Error('One.UI.Image on web takes a url or { uri }, not an asset id')
  }
  return typeof source === 'string' ? source : source.uri
}

// web draws an img, so no web bundle needs react-native-web. load events carry
// the same nativeEvent shapes as native.
export function Image({
  source,
  resizeMode = 'cover',
  onLoadStart,
  onLoad,
  onError,
  onLoadEnd,
  style,
  testID,
  nativeID,
  accessibilityLabel,
  alt,
}: ImageProps) {
  const uri = webUri(source)

  useEffect(() => {
    onLoadStart?.()
  }, [uri])

  return (
    <img
      src={uri}
      alt={alt ?? accessibilityLabel ?? ''}
      data-testid={testID}
      id={nativeID}
      draggable={false}
      style={{ display: 'block', objectFit: OBJECT_FIT[resizeMode], ...domStyle(style) }}
      onLoad={(event) => {
        const { naturalWidth: width, naturalHeight: height } = event.currentTarget
        onLoad?.({ nativeEvent: { source: { uri, width, height } } })
        onLoadEnd?.()
      }}
      onError={() => {
        onError?.({ nativeEvent: { error: `failed to load ${uri}` } })
        onLoadEnd?.()
      }}
    />
  )
}
