import { Text } from 'react-native'
import { Image } from '@tamagui/image-next'
import sampleAssetPng from '../sample-asset.png'

export default function Index() {
  return <Image testID="sample-asset-png" src={sampleAssetPng} width={128} height={128} />
}
