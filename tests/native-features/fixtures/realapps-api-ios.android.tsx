import { Text, View } from 'react-native'
import { Results } from './realapps-api-report'

const apis = [
  'One.iOS.Color',
  'One.iOS.MenuAction',
  'One.iOS.SplitView',
  'One.iOS.ToolbarHost',
  'One.iOS.ToolbarItem',
  'One.iOS.ZoomTransitionEnabler',
  'One.iOS.ZoomTransitionSource',
  'One.iOS.ArrangementView',
  'One.iOS.Button',
  'One.iOS.Glass',
  'One.iOS.Image',
  'One.iOS.SignInWithAppleButton',
  'One.iOS.Tab',
  'One.iOS.Tabs',
  'One.iOS.Toolbar',
  'One.iOS.ToolbarItemGroup',
]
const results = Object.fromEntries(
  apis.map((api) => [
    api,
    {
      api,
      status: 'unsupported' as const,
      scope: 'iOS namespace; no Android replacement rendered and no pass granted',
    },
  ])
)
export default function IOSUnsupported() {
  return (
    <View>
      <Results results={results} />
      <Text>iOS primitives unsupported on Android</Text>
    </View>
  )
}
export const ZoomDestination = IOSUnsupported
