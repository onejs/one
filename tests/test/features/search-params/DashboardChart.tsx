import { useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSearchParams } from 'one'
import { z } from 'zod'

export const chartParams = z.object({
  metric: z.enum(['users', 'revenue']).default('users'),
})

export function DashboardChart() {
  const [{ metric }, update] = useSearchParams(chartParams)
  const mountId = useRef(Math.random().toString(36).slice(2)).current

  return (
    <View testID="chart">
      <Text testID="chart-mount">{mountId}</Text>
      <Text testID="chart-metric">metric {metric}</Text>
      <Pressable
        testID="chart-toggle"
        onPress={() => update({ metric: metric === 'users' ? 'revenue' : 'users' })}
      >
        <Text>toggle metric</Text>
      </Pressable>
    </View>
  )
}
