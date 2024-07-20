import { Stack } from 'vxs'

export default function Layout() {
  return (
    <>
      <Stack screenOptions={{}}>
        <Stack.Screen
          name="example-tabs"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  )
}
