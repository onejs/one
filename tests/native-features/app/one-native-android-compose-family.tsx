import { useState } from 'react'
import { Button, ScrollView, Text, View } from 'react-native'
import { One, useNativeState } from 'one'
import { scheduleOnRN } from 'react-native-worklets'

export default function ComposeFamilyFixture() {
  const [family, setFamily] = useState('switch')
  const [dialog, setDialog] = useState(false)
  const [dismissals, setDismissals] = useState(0)
  const [fabPresses, setFabPresses] = useState(0)
  const [range, setRange] = useState('pending')
  const [rangeDialog, setRangeDialog] = useState(false)
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [carouselKind, setCarouselKind] = useState('uncontained')
  const checked = useNativeState(false)
  const [callbackValue, setCallbackValue] = useState(false)
  const onCheckedChangeSync = (value: boolean) => {
    'worklet'
    scheduleOnRN(setCallbackValue, value)
  }
  const [externalRevision, setExternalRevision] = useState(0)
  const onRange = (next: { start: Date | null; end: Date | null }) =>
    setRange(
      `${next.start?.toISOString().slice(0, 10) ?? 'none'}/${next.end?.toISOString().slice(0, 10) ?? 'none'}`
    )
  const items = Array.from({ length: 8 }, (_, index) => (
    <One.Android.Box
      key={index}
      composeStyle={{
        height: 100,
        fillMaxWidth: true,
        backgroundColor: index % 2 ? '#0055aa' : '#aa3300',
      }}
    >
      <One.Android.Text text={`Carousel item ${index}`} testID={`compose-family-item-${index}`} />
    </One.Android.Box>
  ))
  return (
    <ScrollView
      testID="compose-family-screen"
      contentContainerStyle={{ padding: 16, gap: 8 }}
    >
      <Text>Android Compose family</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['switch', 'dialog', 'carousel', 'range', 'toolbar', 'shape'].map((name) => (
          <Button
            key={name}
            title={name}
            testID={`compose-family-select-${name}`}
            onPress={() => setFamily(name)}
          />
        ))}
      </View>
      {family === 'switch' && (
        <>
          <Text testID="compose-family-switch-status">{`State: ${checked.value} Callback: ${callbackValue} Revision: ${externalRevision}`}</Text>
          <One.Android.SyncSwitch
            testID="compose-family-switch"
            isOn={checked}
            onCheckedChangeSync={onCheckedChangeSync}
          />
          <One.Android.SyncSwitch testID="compose-family-switch-copy" isOn={checked} />
          <One.Android.SyncSwitch
            testID="compose-family-switch-disabled"
            isOn={checked}
            enabled={false}
          />
          <Button
            title="External reset"
            testID="compose-family-switch-reset"
            onPress={() => {
              checked.value = false
              setCallbackValue(false)
              setExternalRevision((value) => value + 1)
            }}
          />
        </>
      )}
      {family === 'dialog' && (
        <>
          <Text testID="compose-family-dismissals">{`Dismissals: ${dismissals}`}</Text>
          <Button
            title="Open custom dialog"
            testID="compose-family-dialog-open"
            onPress={() => setDialog(true)}
          />
          {dialog && (
            <One.Android.BasicAlertDialog
              properties={{ dismissOnBackPress: false, dismissOnClickOutside: false }}
              onDismissRequest={() => {
                setDismissals((value) => value + 1)
                setDialog(false)
              }}
            >
              <One.Android.Column composeStyle={{ padding: 24, backgroundColor: '#ffffff' }}>
                <One.Android.Text
                  testID="compose-family-dialog-content"
                  text="Custom dialog content"
                />
                <One.Android.Button
                  testID="compose-family-dialog-close"
                  label="Close custom dialog"
                  onPress={() => setDialog(false)}
                />
              </One.Android.Column>
            </One.Android.BasicAlertDialog>
          )}
        </>
      )}
      {family === 'carousel' && (
        <>
          <Text testID="compose-family-scroll-status">{`Scroll: ${scrollEnabled}`}</Text>
          <Button
            title="Toggle scrolling"
            testID="compose-family-scroll-toggle"
            onPress={() => setScrollEnabled((value) => !value)}
          />
          {['uncontained', 'hero', 'multi'].map((kind) => (
            <Button
              key={kind}
              title={kind}
              testID={`compose-family-carousel-${kind}`}
              onPress={() => setCarouselKind(kind)}
            />
          ))}
          {carouselKind === 'uncontained' && (
            <One.Android.HorizontalUncontainedCarousel
              key={String(scrollEnabled)}
              testID="compose-family-carousel"
              itemWidth={180}
              itemSpacing={8}
              userScrollEnabled={scrollEnabled}
              style={{ height: 100 }}
            >
              {items}
            </One.Android.HorizontalUncontainedCarousel>
          )}
          {carouselKind === 'hero' && (
            <One.Android.HorizontalCenteredHeroCarousel
              testID="compose-family-carousel"
              maxItemWidth={240}
              itemSpacing={8}
              style={{ height: 100 }}
            >
              {items}
            </One.Android.HorizontalCenteredHeroCarousel>
          )}
          {carouselKind === 'multi' && (
            <One.Android.HorizontalMultiBrowseCarousel
              testID="compose-family-carousel"
              preferredItemWidth={180}
              itemSpacing={8}
              style={{ height: 100 }}
            >
              {items}
            </One.Android.HorizontalMultiBrowseCarousel>
          )}
        </>
      )}
      {family === 'range' && (
        <>
          <Text testID="compose-family-range-status">{range}</Text>
          <Button
            title="Open range dialog"
            testID="compose-family-range-open"
            onPress={() => setRangeDialog(true)}
          />
          <One.Android.DateRangePicker
            initialStartDate="2026-10-12"
            initialEndDate="2026-10-14"
            selectableDates={{
              start: new Date('2026-10-01'),
              end: new Date('2026-10-31'),
            }}
            onDateRangeSelected={onRange}
            style={{ height: 500 }}
          />
          {rangeDialog && (
            <One.Android.DateRangePickerDialog
              initialStartDate="2026-10-12"
              variant="picker"
              selectableDates={{ start: new Date('2026-10-01'), end: new Date('2026-10-31') }}
              confirmButtonLabel="Confirm range"
              dismissButtonLabel="Cancel range"
              onDateRangeSelected={(next) => {
                onRange(next)
                setRangeDialog(false)
              }}
              onDismissRequest={() => setRangeDialog(false)}
            />
          )}
        </>
      )}
      {family === 'toolbar' && (
        <>
          <Text testID="compose-family-toolbar-status">{`FAB presses: ${fabPresses}`}</Text>
          <One.Android.HorizontalFloatingToolbar variant="vibrant" style={{ height: 100 }}>
            <One.Android.IconButton onClick={() => setFabPresses((value) => value + 10)}>
              <One.Android.Icon name="edit" />
            </One.Android.IconButton>
            <One.Android.HorizontalFloatingToolbar.FloatingActionButton
              testID="compose-family-toolbar-fab"
              onPress={() => setFabPresses((value) => value + 1)}
            >
              <One.Android.Icon name="add" />
            </One.Android.HorizontalFloatingToolbar.FloatingActionButton>
          </One.Android.HorizontalFloatingToolbar>
        </>
      )}
      {family === 'shape' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(One.Android.Shape).map(([name, Component]) => (
            <Component
              key={name}
              testID={`compose-family-shape-${name}`}
              color="#ff0000"
              radius={1}
              innerRadius={0.5}
              verticesCount={5}
              cornerRounding={0.05}
              cornerRadii={{ topStart: 24, bottomEnd: 24 }}
              style={{ width: 100, height: 100 }}
            />
          ))}
        </View>
      )}
    </ScrollView>
  )
}
