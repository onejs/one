import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import NativePictureInPicture from '../specs/OneNativePictureInPictureNativeComponent'

export type PictureInPictureProps = ViewProps & {
  children?: ReactNode
  /** asks for the pip window; acted on when it changes */
  active?: boolean
  /** enters pip when the app goes to the background */
  autoEnter?: boolean
  /** every real transition, including ones the system makes on its own */
  onActiveChange?: (active: boolean) => void
}

// uniform picture in picture. the children float in the system pip window
// and keep updating: ios renders them into an AVSampleBufferDisplayLayer
// content source, android shows them full-window while the activity is in
// pip mode. the app's native.app.pictureInPicture turns on the background
// mode and activity flag both platforms require.
export function PictureInPicture({
  active = false,
  autoEnter = false,
  onActiveChange,
  ...props
}: PictureInPictureProps) {
  return (
    <NativePictureInPicture
      {...props}
      active={active}
      autoEnter={autoEnter}
      onNativePictureInPictureChange={({ nativeEvent }) =>
        onActiveChange?.(nativeEvent.active)
      }
    />
  )
}
