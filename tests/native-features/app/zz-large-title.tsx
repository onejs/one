import { One } from 'one'
import { useState } from 'react'
import { View } from 'react-native'

const Swift = One.iOS
const ROWS = Array.from({ length: 30 }, (_, index) => `Row ${index + 1}`)
const UNDER = { ignoresSafeAreaWithRegionsAndEdgesAndAlignment: { regions: 'container', edges: 'vertical', alignment: null } } as const

export default function ZzLargeTitle() {
  const [tab, setTab] = useState('composed')
  return (
    <View style={{ flex: 1 }}>
      <Swift.TabView selection={tab} onSelectionChange={setTab} style={{ flex: 1 }}>
        <Swift.Tab
          value="composed"
          titleKey="Composed"
          systemImage="gauge.with.dots.needle.67percent"
          navigationStack={false}
          swiftStyle={UNDER}
        >
          <View style={{ flex: 1 }}>
            <Swift.NavigationStack style={{ flex: 1 }}>
              <Swift.List
                listStyle="insetGrouped"
                style={{ flex: 1 }}
                swiftStyle={{ navigationTitleWithText: 'Composed', navigationBarTitleDisplayMode: 'large' }}
              >
                <Swift.Section title="Rows">
                  {ROWS.map((row) => (
                    <Swift.Text key={row} text={row} />
                  ))}
                </Swift.Section>
              </Swift.List>
            </Swift.NavigationStack>
          </View>
        </Swift.Tab>
        <Swift.Tab
          value="hosted"
          titleKey="Hosted"
          systemImage="tray.full"
          swiftStyle={{ navigationTitleWithText: 'Hosted', navigationBarTitleDisplayMode: 'large' }}
        >
          <View style={{ flex: 1 }}>
            <Swift.Form sizing="fill">
              <Swift.Section title="Rows">
                {ROWS.map((row) => (
                  <Swift.Text key={row} text={row} />
                ))}
              </Swift.Section>
            </Swift.Form>
          </View>
        </Swift.Tab>
      </Swift.TabView>
    </View>
  )
}
