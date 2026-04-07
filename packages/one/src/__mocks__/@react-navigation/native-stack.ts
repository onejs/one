// Mock for @react-navigation/native-stack used in vitest tests

export type NativeStackNavigationOptions = {
  title?: string
  headerLargeTitleEnabled?: boolean
  headerTitleAlign?: 'left' | 'center'
  headerTitleStyle?: any
  headerLargeTitleStyle?: any
  headerBackTitle?: string
  headerBackTitleStyle?: any
  headerBackIcon?: any
  headerBackButtonDisplayMode?: string
  headerBackButtonMenuEnabled?: boolean
  headerBackVisible?: boolean
  headerSearchBarOptions?: any
  headerShown?: boolean
  headerBlurEffect?: string
  headerStyle?: any
  headerLargeStyle?: any
  headerShadowVisible?: boolean
  headerLargeTitleShadowVisible?: boolean
  headerLeft?: () => any
  headerRight?: () => any
  header?: () => any
  animation?: string
  gestureEnabled?: boolean
}

export const createNativeStackNavigator = () => ({
  Navigator: () => null,
  Screen: () => null,
})
