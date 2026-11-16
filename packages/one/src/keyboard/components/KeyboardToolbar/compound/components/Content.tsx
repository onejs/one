import React from 'react'
import { StyleSheet, View } from 'react-native'

import { TEST_ID_KEYBOARD_TOOLBAR_CONTENT } from '../../constants'

import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'

const Content: React.FC<ViewProps & { children?: ReactNode }> = ({ children }) => {
  return (
    <View style={styles.flex} testID={TEST_ID_KEYBOARD_TOOLBAR_CONTENT}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
})

export default Content
