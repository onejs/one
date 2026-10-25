import { Image as RNImage } from 'react-native'
import type { ImageProps } from './Image.native'

// macos has no nitro image backend; react native's image view loads and draws
// it, and its load events already carry the shapes One.UI.Image reports.
export function Image({ source, resizeMode = 'cover', recyclingKey: _recyclingKey, ...props }: ImageProps) {
  const rnSource = typeof source === 'string' ? { uri: source } : source
  return <RNImage source={rnSource} resizeMode={resizeMode} {...props} />
}
