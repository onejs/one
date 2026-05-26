import { createNativeStackNavigator } from '@react-navigation/native-stack'

/**
 * Returns a Stack navigator factory. On native this is the stock
 * `@react-navigation/native-stack`; on web this is replaced via the
 * `.web.ts` sibling with a custom navigator that supports the `render`
 * prop for overlay presentations.
 */
export const createStackNavigator = createNativeStackNavigator
