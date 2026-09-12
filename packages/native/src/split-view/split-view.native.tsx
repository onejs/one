// adapted from expo-router (MIT license) - https://github.com/expo/expo
import React, { createContext, isValidElement, useContext, type ReactNode } from 'react'
import { Platform, View } from 'react-native'

const IsWithinSplitViewContext = createContext(false)

export interface SplitViewColumnProps {
  children?: React.ReactNode
}

function SplitViewColumnComponent(props: SplitViewColumnProps) {
  if (Platform.OS !== 'ios') return <View>{props.children}</View>
  return <>{props.children}</>
}

function SplitViewInspectorComponent(props: SplitViewColumnProps) {
  if (Platform.OS !== 'ios') return <View>{props.children}</View>
  return <>{props.children}</>
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

  const { Split } = require('react-native-screens/experimental')

  const allChildrenArray = React.Children.toArray(children)
  const columnChildren = allChildrenArray.filter(
    (child) => isValidElement(child) && child.type === SplitViewColumnComponent
  ) as React.ReactElement<SplitViewColumnProps>[]
  const inspectorChildren = allChildrenArray.filter(
    (child) => isValidElement(child) && child.type === SplitViewInspectorComponent
  ) as React.ReactElement<SplitViewColumnProps>[]

  if (columnChildren.length > 2) {
    throw new Error('There can only be two SplitView.Column in the SplitView.')
  }

  if (columnChildren.length + inspectorChildren.length === 0) {
    console.warn('No SplitView.Column found in SplitView.')
    return Slot ? <Slot /> : null
  }

  return (
    <IsWithinSplitViewContext.Provider value={true}>
      <Split.Host
        key={columnChildren.length + inspectorChildren.length}
        preferredDisplayMode="oneBesideSecondary"
        {...rest}
      >
        {columnChildren.map((child, index) => (
          <Split.Column key={`column-${index}`}>{child.props.children}</Split.Column>
        ))}
        <Split.Column>{Slot ? <Slot /> : null}</Split.Column>
        {inspectorChildren.map((child, index) => (
          <Split.Inspector key={`inspector-${index}`}>
            {child.props.children}
          </Split.Inspector>
        ))}
      </Split.Host>
    </IsWithinSplitViewContext.Provider>
  )
}

export const SplitView = Object.assign(SplitViewNavigator, {
  Column: SplitViewColumnComponent,
  Inspector: SplitViewInspectorComponent,
})
