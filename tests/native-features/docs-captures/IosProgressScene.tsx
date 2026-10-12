import { One } from 'one'
import { View } from 'react-native'

// progress bars, then gauges in linear and circular styles. an indeterminate spinner
// never holds still, so the capture leaves it out.
export function IosProgressScene() {
  return (
    <View
      style={{
        width: 300,
        height: 420,
        borderRadius: 44,
        borderCurve: 'continuous',
        overflow: 'hidden',
      }}
    >
      <One.iOS.Form style={{ flex: 1 }}>
        <One.iOS.Section>
          <One.iOS.ProgressView label="Uploading 4 of 6" value={4} total={6} />
          <One.iOS.ProgressView label="Downloading maps" value={0.35} />
        </One.iOS.Section>
        <One.iOS.Section>
          <One.iOS.Gauge
            label="Storage"
            value={0.72}
            gaugeStyle="linearCapacity"
            minimumValueLabel="0"
            maximumValueLabel="256 GB"
          />
          <One.iOS.HStack spacing={18}>
            <One.iOS.Gauge
              label="Speed"
              value={64}
              maximumValue={120}
              currentValueLabel="64"
              gaugeStyle="accessoryCircular"
            />
            <One.iOS.Gauge
              label="Battery"
              value={0.8}
              currentValueLabel="80"
              gaugeStyle="accessoryCircularCapacity"
              swiftStyle={{ tint: '#34C759' }}
            />
            <One.iOS.Gauge
              label="Rings"
              value={0.45}
              currentValueLabel="45"
              gaugeStyle="accessoryCircularCapacity"
              swiftStyle={{ tint: '#FF2D55' }}
            />
          </One.iOS.HStack>
        </One.iOS.Section>
      </One.iOS.Form>
    </View>
  )
}
