import { LinearGradient } from '@tamagui/linear-gradient'
import { ImageBackground } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, View } from 'tamagui'
import { useIsDark } from '~/features/theme/useIsDark'
interface GradientBackgroundProps {
  useImage?: boolean
  useInsets?: boolean
  children?: React.ReactNode
}
export const GradientBackground = ({
  useImage = false,
  useInsets = true,
  children,
}: GradientBackgroundProps) => {
  const inset = useSafeAreaInsets()
  const isDark = useIsDark()
  const theme = useTheme()
  if (useImage) {
    return (
      <>
        <View flex={1} pb={useInsets ? inset.bottom : 0}>
          {children}
        </View>
        <ImageBackground
          source={
            isDark
              ? require('../../../assets/background-dark.png')
              : require('../../../assets/background-light.png')
          }
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            },
            {
              zIndex: -2,
            },
          ]}
          resizeMode="cover"
        />
      </>
    )
  }
  const color1 = theme['color-1'].val
  const color2 = theme['color-2'].val
  const color3 = theme['color-3'].val
  return (
    <View flex={1} pb={useInsets ? inset.bottom : 0}>
      <LinearGradient
        colors={[color1, color2, color3, color1]}
        locations={[0, 0.3, 0.6, 1]}
        start={[0, 0]}
        end={[1, 1]}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
          {
            zIndex: -2,
          },
        ]}
      />
      {children}
    </View>
  )
}
