import { createNavigatorFactory, TabRouter, useNavigationBuilder } from '@react-navigation/native'
import { LinuxNavigationView } from '../platform/linux/NavigationView.linux'
import { Protected } from '../views/Protected'
import { processNativeTabsScreens } from './nativeTabsOptions'
import { withLayoutContext } from './withLayoutContext'

function LinuxTabsNavigator(props: any) {
  const { state, descriptors, navigation, render } = useNavigationBuilder(TabRouter, props)
  return render(<LinuxNavigationView tabs state={state} descriptors={descriptors} navigation={navigation} />)
}

const Navigator = createNavigatorFactory(LinuxTabsNavigator)().Navigator
const RNTabs = withLayoutContext(Navigator, processNativeTabsScreens)
export const Tabs = Object.assign(RNTabs, { Protected, Screen: RNTabs.Screen })
export default Tabs
