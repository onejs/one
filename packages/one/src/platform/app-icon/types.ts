import type { ImageURISource } from 'react-native'

export type AppIconEntry = {
  // the value for setIcon: an alternate's name, or undefined for the primary.
  name: string | undefined
  // the icon's bundled preview image, ready for an Image source.
  preview: ImageURISource
}
