import { Stack } from 'one'
import { HeaderBackButton } from '~/interface/buttons/HeaderBackButton'
export function SettingLayout() {
  return (
    <Stack
      screenOptions={{
        headerBlurEffect: 'regular',
        headerTransparent: true,
        headerLargeStyle: {
          backgroundColor: 'transparent',
        },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
          headerLargeTitleEnabled: true,
          headerLeft: () => <HeaderBackButton />,
        }}
      />
    </Stack>
  )
}
