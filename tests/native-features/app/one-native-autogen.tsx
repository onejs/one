import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { One } from 'one'

export default function NativeAutogenProof() {
  const [selection, setSelection] = useState('proof')
  const [menuSelected, setMenuSelected] = useState(false)
  const [inspectorVisible, setInspectorVisible] = useState(false)
  const [fieldFocused, setFieldFocused] = useState(false)
  const [fieldText, setFieldText] = useState('')
  const [tapPoint, setTapPoint] = useState<{ x: number; y: number } | null>(null)
  const [scrollPosition, setScrollPosition] = useState<string | null>(null)
  const [visibleTargets, setVisibleTargets] = useState<readonly string[]>([])
  const [geometryScrolled, setGeometryScrolled] = useState(false)
  const [anchorWidth, setAnchorWidth] = useState<number | null>(null)
  const [transformedAnchorWidth, setTransformedAnchorWidth] = useState<number | null>(null)
  return (
    <One.iOS.Tabs
      selection={selection}
      onSelectionChange={setSelection}
      swiftStyle={{ tabBarMinimizeBehavior: 'onScrollDown' }}
    >
      <One.iOS.Tab id="proof" title="Proof" systemImage="wand.and.stars">
        <ScrollView style={{ flex: 1, backgroundColor: '#f5f6fa' }}>
          <View style={{ padding: 24, gap: 12 }}>
            <Text testID="autogen-heading" style={{ fontSize: 22, fontWeight: '600' }}>
              SwiftUI SDK generation
            </Text>
            <One.iOS.Text text="Standard native text" swiftStyle={{ fontSize: 24 }} />
            <One.iOS.Text
              text="Bold and tracked native text"
              swiftStyle={{ fontSize: 24, bold: true, tracking: 3 }}
            />
            <One.iOS.Text
              text="Generated anchor bounds"
              swiftStyle={{ anchorPreference: ({ size }) => setAnchorWidth(size.width) }}
            />
            <One.iOS.Text text={anchorWidth === null ? 'Generated anchor pending' : `Generated anchor width ${Math.round(anchorWidth)}`} />
            <One.iOS.Text
              text="Generated transformed anchor bounds"
              swiftStyle={{ transformAnchorPreference: ({ size }) => setTransformedAnchorWidth(size.width) }}
            />
            <One.iOS.Text text={transformedAnchorWidth === null ? 'Generated transformed anchor pending' : `Generated transformed anchor width ${Math.round(transformedAnchorWidth)}`} />
            <One.iOS.Text
              text="Generated phase opacity"
              swiftStyle={{ phaseAnimator: { effect: 'opacity', phases: [1, 0.25], duration: 0.5 } }}
            />
            <One.iOS.Text
              text="Generated keyframe scale"
              swiftStyle={{ keyframeAnimator: { effect: 'scale', initialValue: 1, frames: [
                { value: 1.25, duration: 0.4 }, { value: 1, duration: 0.4 },
              ] } }}
            />
            <One.iOS.Text
              text="Tap for a generated point event"
              swiftStyle={{ onTapGestureWithPerform: setTapPoint }}
            />
            <One.iOS.Text text={tapPoint ? `Generated tap at ${Math.round(tapPoint.x)}, ${Math.round(tapPoint.y)}` : 'Generated tap ready'} />
            <One.iOS.Button label="Scroll generated position" onPress={() => setScrollPosition('row-12')} />
            <One.iOS.ScrollView
              style={{ height: 100 }}
              swiftStyle={{
                scrollPositionWithId: { value: scrollPosition, onChange: setScrollPosition },
                onScrollTargetVisibilityChange: setVisibleTargets,
                onScrollGeometryChangeWithContentOffset: ({ newValue }) => {
                  if (newValue.y > 1) setGeometryScrolled(true)
                },
              }}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <One.iOS.Text
                  key={index}
                  text={`Scroll target ${index + 1}`}
                  swiftStyle={{ id: `row-${index + 1}`, fontSize: 30 }}
                />
              ))}
            </One.iOS.ScrollView>
            <One.iOS.Text text={visibleTargets.includes('row-12') ? 'Generated last target visible' : 'Generated last target hidden'} />
            <One.iOS.Text text={geometryScrolled ? 'Generated geometry scrolled' : 'Generated geometry idle'} />
            <One.iOS.ViewSlot name="contextMenu">
              <One.iOS.Text text="Hold for a generated context menu" />
              <One.iOS.ViewSlot.Content>
                <One.iOS.Button label="Generated menu item" onPress={() => setMenuSelected(true)} />
              </One.iOS.ViewSlot.Content>
            </One.iOS.ViewSlot>
            <One.iOS.Text text={menuSelected ? 'Generated menu selected' : 'Generated menu ready'} />
            <One.iOS.Button label="Focus generated field" onPress={() => setFieldFocused(true)} testID="autogen-focus-button" />
            <One.iOS.TextField
              label="Generated focus field"
              text={fieldText}
              onTextChange={setFieldText}
              testID="autogen-focus-field"
              swiftStyle={{ focused: { value: fieldFocused, onChange: setFieldFocused } }}
            />
            <One.iOS.Text text={fieldFocused ? 'Generated focus active' : 'Generated focus idle'} />
            <One.iOS.ViewSlot name="containerBackground" options={{ container: 'navigation' }}>
              <One.iOS.Text text="Generated container background" />
              <One.iOS.ViewSlot.Content>
                <One.iOS.Text text="Native background content" />
              </One.iOS.ViewSlot.Content>
            </One.iOS.ViewSlot>
            <One.iOS.ViewSlot name="safeAreaInsetWithVerticalEdge" options={{ edge: 'bottom' }}>
              <One.iOS.Text text="Generated safe area base" />
              <One.iOS.ViewSlot.Content>
                <One.iOS.Text text="Generated bottom inset" />
              </One.iOS.ViewSlot.Content>
            </One.iOS.ViewSlot>
            <One.iOS.ViewSlot
              name="inspector"
              options={{ isPresented: { value: inspectorVisible, onChange: setInspectorVisible } }}
            >
              <One.iOS.Button label="Show generated inspector" onPress={() => setInspectorVisible(true)} />
              <One.iOS.ViewSlot.Content>
                <One.iOS.Text text="Generated inspector content" />
              </One.iOS.ViewSlot.Content>
            </One.iOS.ViewSlot>
            <Text>Scroll to collapse the tab bar accessory.</Text>
            <View style={{ height: 900 }} />
          </View>
        </ScrollView>
      </One.iOS.Tab>
      <One.iOS.Tab id="other" title="Other" systemImage="square.grid.2x2">
        <View style={{ flex: 1, padding: 24 }}>
          <Text>Second tab</Text>
        </View>
      </One.iOS.Tab>
      <One.iOS.TabViewBottomAccessory
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
    </One.iOS.Tabs>
  )
}
