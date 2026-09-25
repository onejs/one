import { Children, isValidElement, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import type {
  ArrangementPaneProps,
  ArrangementViewProps,
} from './ArrangementView.native'

export function ArrangementPrimary(_props: ArrangementPaneProps): never {
  throw new Error('Swift.ArrangementView.Primary must be a direct child of Swift.ArrangementView')
}

export function ArrangementSecondary(_props: ArrangementPaneProps): never {
  throw new Error('Swift.ArrangementView.Secondary must be a direct child of Swift.ArrangementView')
}

export function ArrangementViewComponent({
  children,
  primary,
  secondary,
  leading,
  detail,
  style,
  testID,
}: ArrangementViewProps) {
  let primaryNode: ReactNode = primary ?? leading
  let secondaryNode: ReactNode = secondary ?? detail

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === ArrangementPrimary) {
      primaryNode = (child.props as ArrangementPaneProps).children
    } else if (child.type === ArrangementSecondary) {
      secondaryNode = (child.props as ArrangementPaneProps).children
    }
  })

  return (
    <View testID={testID} style={[{ flex: 1, flexDirection: 'row' }, style]}>
      <View style={{ flex: 1 }}>{primaryNode}</View>
      <View style={{ flex: 1 }}>{secondaryNode}</View>
    </View>
  )
}

export const ArrangementView = Object.assign(ArrangementViewComponent, {
  Primary: ArrangementPrimary,
  Secondary: ArrangementSecondary,
  Leading: ArrangementPrimary,
  Detail: ArrangementSecondary,
})
