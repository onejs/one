import { useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'one'
import Services from './realapps-api-services.native'
import SharedUI from './realapps-api-ui.native'
import IOSPrimitives from './realapps-api-ios'
import Widgets from './realapps-api-widgets'
import Menus from './realapps-api-menus.native'
import { Action } from './realapps-api-report'

// inject as a sibling route in the app's existing route tree, never as _layout.
export default function RealAppsAPI() {
  const [section, setSection] = useState('services')
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, paddingTop: insets.top }} testID="realapps-api-route">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {['services', 'ui', 'ios', 'widgets', 'menus'].map((name) => (
          <Action key={name} id={`section-${name}`} onPress={() => setSection(name)}>
            {name}
          </Action>
        ))}
      </View>
      {section === 'services' ? (
        <Services />
      ) : section === 'ui' ? (
        <SharedUI />
      ) : section === 'ios' ? (
        <IOSPrimitives />
      ) : section === 'widgets' ? (
        <Widgets />
      ) : (
        <Menus />
      )}
    </View>
  )
}
