import React, { useMemo } from 'react'
import { Animated, StyleSheet, View } from 'react-native'

import { useKeyboardState } from '../../hooks'

import type { KeyboardToolbarTheme } from './types'
import type { ViewStyle } from 'react-native'

type ArrowProps = {
  type: 'prev' | 'next'
  disabled?: boolean
  theme: KeyboardToolbarTheme
}

const ArrowComponent: React.FC<ArrowProps> = ({ type, disabled, theme }) => {
  const colorScheme = useKeyboardState((state) => state.appearance)

  const color = useMemo(
    () => ({
      backgroundColor: disabled
        ? theme[colorScheme].disabled
        : theme[colorScheme].primary,
    }),
    [disabled, theme, colorScheme]
  )
  const left = useMemo(() => [styles.arrowLeftLine, color], [color])
  const right = useMemo(() => [styles.arrowRightLine, color], [color])

  return (
    <View style={type === 'next' ? styles.arrowDownContainer : styles.arrowUpContainer}>
      <View style={styles.arrow}>
        <Animated.View style={left} />
        <Animated.View style={right} />
      </View>
    </View>
  )
}

const arrowLine: ViewStyle = {
  width: 13,
  height: 2,
  borderRadius: 1,
}
const arrowUpContainer: ViewStyle = {
  marginHorizontal: 5,
  width: 30,
  height: 30,
  justifyContent: 'center',
  alignItems: 'center',
}
const styles = StyleSheet.create({
  arrowUpContainer: arrowUpContainer,
  arrowDownContainer: {
    ...arrowUpContainer,
    transform: [{ rotate: '180deg' }],
  },
  arrow: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowLeftLine: {
    ...arrowLine,
    transform: [{ rotate: '-45deg' }],
    left: -0.5,
  },
  arrowRightLine: {
    ...arrowLine,
    transform: [{ rotate: '45deg' }],
    left: -5.5,
  },
})

export default ArrowComponent
