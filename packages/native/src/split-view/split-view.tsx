// adapted from expo-router (MIT license) - https://github.com/expo/expo
import React, { createContext, isValidElement, useContext, type ReactNode } from 'react'
import { Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Split, type SplitHostProps } from 'react-native-screens/experimental'

const IsWithinSplitViewContext = createContext(false)

export interface SplitViewColumnProps {
  children?: React.ReactNode
}

function SplitViewColumnComponent(props: SplitViewColumnProps) {
  return (
    <Split.Column>
      <SafeAreaProvider>{props.children}</SafeAreaProvider>
    </Split.Column>
  )
}

function SplitViewInspectorComponent(props: SplitViewColumnProps) {
  return <Split.Inspector>{props.children}</Split.Inspector>
}

export interface SplitViewProps extends Omit<SplitHostProps, 'children'> {
  children?: ReactNode
  /** slot component to render for the main content area */
  slot?: React.ComponentType
}

function SplitViewNavigator({
  children,
  slot: Slot,
  ...splitViewHostProps
}: SplitViewProps) {
  if (useContext(IsWithinSplitViewContext)) {
    throw new Error('There can only be one SplitView in the navigation hierarchy.')
  }

  if (Platform.OS !== 'ios') {
    console.warn('SplitView is only supported on iOS.')
    return Slot ? <Slot /> : null
  }

  const allChildrenArray = React.Children.toArray(children)
  const columnChildren = allChildrenArray.filter(
    (child) => isValidElement(child) && child.type === SplitViewColumnComponent
  )
  const inspectorChildren = allChildrenArray.filter(
    (child) => isValidElement(child) && child.type === SplitViewInspectorComponent
  )
  const numberOfSidebars = columnChildren.length

  if (numberOfSidebars > 2) {
    throw new Error('There can only be two SplitView.Column in the SplitView.')
  }

  if (numberOfSidebars + inspectorChildren.length === 0) {
    console.warn('No SplitView.Column found in SplitView.')
    return Slot ? <Slot /> : null
  }

  return (
    <IsWithinSplitViewContext value>
      <Split.Host
        key={numberOfSidebars + inspectorChildren.length}
        {...splitViewHostProps}
      >
        {columnChildren}
        <Split.Column>{Slot ? <Slot /> : null}</Split.Column>
        {inspectorChildren}
      </Split.Host>
    </IsWithinSplitViewContext>
  )
}

export const SplitView = Object.assign(SplitViewNavigator, {
  Column: SplitViewColumnComponent,
  Inspector: SplitViewInspectorComponent,
})
