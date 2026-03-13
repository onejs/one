import { Platform } from 'react-native'
import { NativeTabs } from '~/code/ui/BottomTabs.native'
import newspaperIcon from '../../assets/icons/newspaper.svg'
import bellIcon from '../../assets/icons/bell.svg'
import userIcon from '../../assets/icons/user.svg'

const isIOS = Platform.OS === 'ios'

export function HomeLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: () =>
            isIOS ? { sfSymbol: 'newspaper' } : newspaperIcon,
        }}
      />

      <NativeTabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: () =>
            isIOS ? { sfSymbol: 'bell' } : bellIcon,
        }}
      />

      <NativeTabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () =>
            isIOS ? { sfSymbol: 'person' } : userIcon,
        }}
      />
    </NativeTabs>
  )
}
