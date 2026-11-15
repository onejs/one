import { createNativeStackNavigator } from '@react-navigation/native-stack'

/**
 * The stock `@react-navigation/native-stack`, as on ios and android. macos has
 * no reanimated yet, so screens get no shared transition boundary.
 */
export const createStackNavigator = createNativeStackNavigator

export { getStackNavigatorProps } from './stack-navigator-desktop'
