import { CommonActions, StackActions } from '@react-navigation/native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useControlled } from '../controlled'
import NativeNavigation, { type SelectEvent } from './OneLinuxNavigationNativeComponent'

export function LinuxNavigationView({ state, navigation, descriptors, tabs = false }: {
  state: any
  navigation: any
  descriptors: any
  tabs?: boolean
}) {
  const [content, setContent] = useState({ width: 0, height: 0 })
  const focused = state.routes[state.index]
  const options = descriptors[focused.key].options
  const mode = tabs ? (options.tabBarPosition === 'left' ? 'sidebar' : 'tabs') : 'stack'
  const controlled = useControlled((event: SelectEvent) => {
    const route = state.routes[event.index]
    if (!route || !tabs) return
    const routeOptions = descriptors[route.key].options
    const repeated = route.key === focused.key && routeOptions.tabBarSelectionEnabled !== false
    const press = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true,
      data: { behavior: { popToTop: repeated && routeOptions.tabBarRepeatedPressBehavior?.popToTop !== false,
        scrollToTop: repeated && routeOptions.tabBarRepeatedPressBehavior?.scrollToTop !== false } } })
    if (!press.defaultPrevented && route.key !== focused.key && routeOptions.tabBarSelectionEnabled !== false) {
      navigation.dispatch({ ...CommonActions.navigate(route.name, route.params), target: state.key })
    }
  }, 0)

  useEffect(() => {
    if (tabs) return
    let frame: ReturnType<typeof requestAnimationFrame> | undefined
    const unsubscribe = navigation.addListener?.('tabPress', (event: any) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const current = navigation.getState()
        if (navigation.isFocused() && !event.defaultPrevented && event.data?.behavior?.popToTop !== false && current.index > 0) {
          navigation.dispatch({ ...StackActions.popToTop(), target: current.key })
        }
      })
    })
    return () => {
      cancelAnimationFrame(frame)
      unsubscribe?.()
    }
  }, [navigation, tabs])

  return (
    <NativeNavigation
      style={{ flex: 1 }}
      mode={mode}
      pageKeys={state.routes.map((route: any) => route.key)}
      pageTitles={state.routes.map((route: any) => descriptors[route.key].options.title ?? route.name)}
      title={typeof options.headerTitle === 'string' ? options.headerTitle : options.title ?? focused.name}
      selectedIndex={state.index}
      headerShown={options.headerShown !== false}
      canGoBack={!tabs && navigation.canGoBack() && options.headerBackVisible !== false}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onSelect={(event) => controlled.onNativeChange(event.nativeEvent)}
      onBack={() => navigation.goBack()}
      onContentLayout={({ nativeEvent }) => setContent({ width: nativeEvent.width, height: nativeEvent.height })}
    >
      {content.width > 0 && state.routes.map((route: any) => (
        <View key={route.key} collapsable={false} style={{ position: 'absolute', left: 0, top: 0, ...content }}>
          <View style={[{ flex: 1 }, descriptors[route.key].options.contentStyle]}>
            {descriptors[route.key].render()}
          </View>
        </View>
      ))}
    </NativeNavigation>
  )
}
