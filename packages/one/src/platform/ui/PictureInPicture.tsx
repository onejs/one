import { View } from 'react-native'
import type { PictureInPictureProps } from './PictureInPicture.native'

// web renders the children inline and never enters pip. document picture in
// picture is chromium only and needs the page's styles copied into its own
// window, so it stays the app's call.
export function PictureInPicture({
  active: _active,
  autoEnter: _autoEnter,
  onActiveChange: _onActiveChange,
  ...props
}: PictureInPictureProps) {
  return <View {...props} />
}
