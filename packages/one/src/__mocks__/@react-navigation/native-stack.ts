// Mock for @react-navigation/native-stack used in vitest tests

export type NativeStackNavigationOptions = {
  title?: string
  headerLargeTitle?: boolean
  headerTitleAlign?: 'left' | 'center'
  headerTitleStyle?: any
  headerLargeTitleStyle?: any
  headerBackTitle?: string
  headerBackTitleStyle?: any
  headerBackImageSource?: any
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
  presentation?:
    | 'card'
    | 'modal'
    | 'transparentModal'
    | 'containedModal'
    | 'containedTransparentModal'
    | 'fullScreenModal'
    | 'formSheet'
    | 'pageSheet'
  sheetAllowedDetents?: number[] | 'fitToContents'
  sheetGrabberVisible?: boolean
  sheetCornerRadius?: number
  sheetInitialDetentIndex?: number | 'last'
  sheetLargestUndimmedDetentIndex?: number | 'none' | 'last'
  sheetExpandsWhenScrolledToEdge?: boolean
}

export type NativeStackNavigationEventMap = Record<string, any>

export const createNativeStackNavigator = () => ({
  Navigator: () => null,
  Screen: () => null,
})

// Stub used by WebStackView in tests — just renders nothing for the
// non-overlay portion of the stack. The tests only assert the overlay
// dispatch behavior.
export const NativeStackView = (_props: any) => null
