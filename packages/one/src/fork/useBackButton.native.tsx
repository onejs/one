/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/native/src/useBackButton.native.tsx
 *
 * No changes are made except of formatting.
 */

import type { NavigationContainerRef, ParamListBase } from '@react-navigation/core'
import * as React from 'react'
import { BackHandler } from 'react-native'

export function useBackButton(
  ref: React.RefObject<NavigationContainerRef<ParamListBase>>
) {
  React.useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const navigation = ref.current

      if (navigation == null) {
        return false
      }

      if (navigation.canGoBack()) {
        navigation.goBack()

        return true
      }

      return false
    })

    return () => subscription.remove()
  }, [ref])
}
