import { createNavigatorFactory, StackRouter, useNavigationBuilder } from '@react-navigation/native'
import { LinuxNavigationView } from '../platform/linux/NavigationView.linux'

// the router and layout contract match the mac host; gtk owns presentation.
export { getStackNavigatorProps } from './stack-navigator-desktop'

function LinuxStackNavigator(props: any) {
  const { state, descriptors, navigation, render } = useNavigationBuilder(StackRouter, props)
  return render(<LinuxNavigationView state={state} descriptors={descriptors} navigation={navigation} />)
}

export const createStackNavigator = createNavigatorFactory(LinuxStackNavigator)
