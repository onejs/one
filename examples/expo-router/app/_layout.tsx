import { Stack } from '@vxrn/expo-router'

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        header() {
          return null
        },
      }}
    />
  )
}
