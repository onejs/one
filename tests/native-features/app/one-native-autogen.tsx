import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Swift } from '@vxrn/native'

export default function NativeAutogenProof() {
  const [selection, setSelection] = useState('proof')
  const [menuSelected, setMenuSelected] = useState(false)
  return (
    <Swift.Tabs
      selection={selection}
      onSelectionChange={setSelection}
      swiftStyle={{ tabBarMinimizeBehavior: 'onScrollDown' }}
    >
      <Swift.Tab id="proof" title="Proof" systemImage="wand.and.stars">
        <ScrollView style={{ flex: 1, backgroundColor: '#f5f6fa' }}>
          <View style={{ padding: 24, gap: 12 }}>
            <Text testID="autogen-heading" style={{ fontSize: 22, fontWeight: '600' }}>
              SwiftUI SDK generation
            </Text>
            <Swift.Text text="Standard native text" swiftStyle={{ fontSize: 24 }} />
            <Swift.Text
              text="Bold and tracked native text"
              swiftStyle={{ fontSize: 24, bold: true, tracking: 3 }}
            />
            <Swift.ViewSlot name="contextMenu">
              <Swift.Text text="Hold for a generated context menu" />
              <Swift.ViewSlot.Content>
                <Swift.Button label="Generated menu item" onPress={() => setMenuSelected(true)} />
              </Swift.ViewSlot.Content>
            </Swift.ViewSlot>
            <Swift.Text text={menuSelected ? 'Generated menu selected' : 'Generated menu ready'} />
            <Swift.ViewSlot name="containerBackground" options={{ container: 'navigation' }}>
              <Swift.Text text="Generated container background" />
              <Swift.ViewSlot.Content>
                <Swift.Text text="Native background content" />
              </Swift.ViewSlot.Content>
            </Swift.ViewSlot>
            <Text>Scroll to collapse the tab bar accessory.</Text>
            <View style={{ height: 900 }} />
          </View>
        </ScrollView>
      </Swift.Tab>
      <Swift.Tab id="other" title="Other" systemImage="square.grid.2x2">
        <View style={{ flex: 1, padding: 24 }}>
          <Text>Second tab</Text>
        </View>
      </Swift.Tab>
      <Swift.TabViewBottomAccessory
        expanded={
          <View testID="autogen-accessory-expanded" style={{ flex: 1, backgroundColor: '#2754bd', justifyContent: 'center', paddingHorizontal: 16 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Expanded accessory</Text>
          </View>
        }
        inline={
          <View testID="autogen-accessory-inline" style={{ flex: 1, backgroundColor: '#2f8a5e', justifyContent: 'center', paddingHorizontal: 16 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Inline accessory</Text>
          </View>
        }
      />
    </Swift.Tabs>
  )
}
