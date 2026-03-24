// adapted from expo-router (MIT license) - https://github.com/expo/expo
import React, { createContext, isValidElement, useContext, type ReactNode } from 'react'
import { Platform, View, Text, UIManager } from 'react-native'

const IsWithinSplitViewContext = createContext(false)

// check if gamma native views are registered
const isSplitViewAvailable =
  Platform.OS === 'ios' && UIManager.getViewManagerConfig?.('RNSSplitViewHost') != null

export interface SplitViewColumnProps {
  children?: React.ReactNode
}

function SplitViewColumnComponent(props: SplitViewColumnProps) {
  if (!isSplitViewAvailable) return <View>{props.children}</View>
  const { Split } = require('react-native-screens/experimental')
  const { SafeAreaProvider } = require('react-native-safe-area-context')
  return (
    <Split.Column>
      <SafeAreaProvider>{props.children}</SafeAreaProvider>
    </Split.Column>
  )
}

function SplitViewInspectorComponent(props: SplitViewColumnProps) {
  if (!isSplitViewAvailable) return <View>{props.children}</View>
  const { Split } = require('react-native-screens/experimental')
  return <Split.Inspector>{props.children}</Split.Inspector>
}

export interface SplitViewProps {
  children?: ReactNode
  slot?: React.ComponentType
}

function SplitViewNavigator({ children, slot: Slot, ...rest }: SplitViewProps) {
  if (useContext(IsWithinSplitViewContext)) {
    throw new Error('There can only be one SplitView in the navigation hierarchy.')
  }

  if (Platform.OS !== 'ios') {
    console.warn('SplitView is only supported on iOS.')
    return Slot ? <Slot /> : null
  }

  if (!isSplitViewAvailable) {
    console.warn(
      "SplitView requires react-native-screens gamma. Add ENV['RNS_GAMMA_ENABLED'] ||= '1' to the top of your Podfile and run pod install."
    )
    return Slot ? <Slot /> : null
  }

  const { Split } = require('react-native-screens/experimental')

  const allChildrenArray = React.Children.toArray(children)
  const columnChildren = allChildrenArray.filter(
    (child) => isValidElement(child) && child.type === SplitViewColumnComponent
  )
  const inspectorChildren = allChildrenArray.filter(
    (child) => isValidElement(child) && child.type === SplitViewInspectorComponent
  )

  if (columnChildren.length > 2) {
    throw new Error('There can only be two SplitView.Column in the SplitView.')
  }

  if (columnChildren.length + inspectorChildren.length === 0) {
    console.warn('No SplitView.Column found in SplitView.')
    return Slot ? <Slot /> : null
  }

  return (
    <IsWithinSplitViewContext.Provider value={true}>
      <Split.Host key={columnChildren.length + inspectorChildren.length} {...rest}>
        {columnChildren}
        <Split.Column>{Slot ? <Slot /> : null}</Split.Column>
        {inspectorChildren}
      </Split.Host>
    </IsWithinSplitViewContext.Provider>
  )
}

export const SplitView = Object.assign(SplitViewNavigator, {
  Column: SplitViewColumnComponent,
  Inspector: SplitViewInspectorComponent,
})
