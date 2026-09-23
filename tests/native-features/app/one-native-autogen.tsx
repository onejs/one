import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Swift } from '@vxrn/native'

export default function NativeAutogenProof() {
  const [selection, setSelection] = useState('proof')
  const [menuSelected, setMenuSelected] = useState(false)
  const [inspectorVisible, setInspectorVisible] = useState(false)
  const [fieldFocused, setFieldFocused] = useState(false)
  const [fieldText, setFieldText] = useState('')
  const [tapPoint, setTapPoint] = useState<{ x: number; y: number } | null>(null)
  const [scrollPosition, setScrollPosition] = useState<string | null>(null)
  const [visibleTargets, setVisibleTargets] = useState<readonly string[]>([])
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
            <Swift.Text
              text="Tap for a generated point event"
              swiftStyle={{ onTapGestureWithPerform: setTapPoint }}
            />
            <Swift.Text text={tapPoint ? `Generated tap at ${Math.round(tapPoint.x)}, ${Math.round(tapPoint.y)}` : 'Generated tap ready'} />
            <Swift.Button label="Scroll generated position" onPress={() => setScrollPosition('row-12')} />
            <Swift.ScrollView
              style={{ height: 100 }}
              swiftStyle={{
                scrollPosition: { value: scrollPosition, onChange: setScrollPosition },
                onScrollTargetVisibilityChange: setVisibleTargets,
              }}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <Swift.Text
                  key={index}
                  text={`Scroll target ${index + 1}`}
                  swiftStyle={{ id: `row-${index + 1}`, fontSize: 30 }}
                />
              ))}
            </Swift.ScrollView>
            <Swift.Text text={visibleTargets.includes('row-12') ? 'Generated last target visible' : 'Generated last target hidden'} />
            <Swift.ViewSlot name="contextMenu">
              <Swift.Text text="Hold for a generated context menu" />
              <Swift.ViewSlot.Content>
                <Swift.Button label="Generated menu item" onPress={() => setMenuSelected(true)} />
              </Swift.ViewSlot.Content>
            </Swift.ViewSlot>
            <Swift.Text text={menuSelected ? 'Generated menu selected' : 'Generated menu ready'} />
            <Swift.Button label="Focus generated field" onPress={() => setFieldFocused(true)} testID="autogen-focus-button" />
            <Swift.TextField
              label="Generated focus field"
              text={fieldText}
              onTextChange={setFieldText}
              testID="autogen-focus-field"
              swiftStyle={{ focused: { value: fieldFocused, onChange: setFieldFocused } }}
            />
            <Swift.Text text={fieldFocused ? 'Generated focus active' : 'Generated focus idle'} />
            <Swift.ViewSlot name="containerBackground" options={{ container: 'navigation' }}>
              <Swift.Text text="Generated container background" />
              <Swift.ViewSlot.Content>
                <Swift.Text text="Native background content" />
              </Swift.ViewSlot.Content>
            </Swift.ViewSlot>
            <Swift.ViewSlot name="safeAreaInsetWithVerticalEdge" options={{ edge: 'bottom' }}>
              <Swift.Text text="Generated safe area base" />
              <Swift.ViewSlot.Content>
                <Swift.Text text="Generated bottom inset" />
              </Swift.ViewSlot.Content>
            </Swift.ViewSlot>
            <Swift.ViewSlot
              name="inspector"
              options={{ isPresented: { value: inspectorVisible, onChange: setInspectorVisible } }}
            >
              <Swift.Button label="Show generated inspector" onPress={() => setInspectorVisible(true)} />
              <Swift.ViewSlot.Content>
                <Swift.Text text="Generated inspector content" />
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
