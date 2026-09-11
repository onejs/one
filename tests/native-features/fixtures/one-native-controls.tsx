import { useState } from 'react'
import { Swift } from 'one-native'
import { Button, Pressable, StyleSheet, Switch, Text, View } from 'react-native'

const categories = ['Picker', 'Date', 'Color', 'Toggle', 'Slider', 'Stepper'] as const
type Category = (typeof categories)[number]

type ControlState = {
  value: string | boolean | number | Date
  observed: string
  revision: number
  externalUpdates: number
}

type ControlStates = Record<Category, ControlState>

const initialDate = new Date('2026-09-10T12:00:00Z')
const minimumDate = new Date('2026-01-01T00:00:00Z')
const maximumDate = new Date('2026-12-31T23:59:59Z')

const initialValues: Record<Category, string | boolean | number | Date> = {
  Picker: 'alpha',
  Date: initialDate,
  Color: '#3366FF',
  Toggle: true,
  Slider: 25,
  Stepper: 2,
}

const initialStates: ControlStates = {
  Picker: { value: 'alpha', observed: 'alpha', revision: 0, externalUpdates: 0 },
  Date: {
    value: initialDate,
    observed: initialDate.toISOString(),
    revision: 0,
    externalUpdates: 0,
  },
  Color: { value: '#3366FF', observed: '#3366FF', revision: 0, externalUpdates: 0 },
  Toggle: { value: true, observed: 'true', revision: 0, externalUpdates: 0 },
  Slider: { value: 25, observed: '25', revision: 0, externalUpdates: 0 },
  Stepper: { value: 2, observed: '2', revision: 0, externalUpdates: 0 },
}

const pickerStyles = ['segmented', 'menu', 'wheel', 'inline'] as const
const datePickerStyles = ['compact', 'graphical', 'wheel'] as const
const pickerOptions = [
  { label: 'Alpha', value: 'alpha' },
  { label: 'Beta', value: 'beta' },
  { label: 'Gamma', value: 'gamma' },
] as const

function displayValue(value: ControlState['value']) {
  return value instanceof Date ? value.toISOString() : String(value)
}

export default function OneNativeControls() {
  const [category, setCategory] = useState<Category>('Picker')
  const [controls, setControls] = useState<ControlStates>(initialStates)
  const [rejectChanges, setRejectChanges] = useState(false)
  const [supportsOpacity, setSupportsOpacity] = useState(true)
  const [pickerStyleIndex, setPickerStyleIndex] = useState(0)
  const [dateStyleIndex, setDateStyleIndex] = useState(0)
  const control = controls[category]
  const pickerStyle = pickerStyles[pickerStyleIndex % pickerStyles.length]
  const datePickerStyle = datePickerStyles[dateStyleIndex % datePickerStyles.length]

  const recordChange = (changedCategory: Category, value: ControlState['value']) => {
    setControls((current) => ({
      ...current,
      [changedCategory]: {
        ...current[changedCategory],
        value: rejectChanges ? current[changedCategory].value : value,
        observed: displayValue(value),
      },
    }))
  }

  return (
    <View style={styles.screen} testID="one-native-controls-screen">
      <View style={styles.categoryGrid}>
        {categories.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            key={item}
            onPress={() => setCategory(item)}
            style={[styles.categoryButton, category === item && styles.selectedCategory]}
            testID={`one-native-control-category-${item.toLowerCase()}`}
          >
            <Text style={styles.categoryText}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.status}>
        <Text numberOfLines={1} style={styles.statusText}>
          Value:{' '}
          <Text testID="one-native-control-value">{displayValue(control.value)}</Text>
        </Text>
        <Text numberOfLines={1} style={styles.statusText}>
          Request: <Text testID="one-native-control-request">{control.observed}</Text>
        </Text>
      </View>

      {(category === 'Picker' || category === 'Date') && (
        <Button
          title="Change style"
          testID="one-native-control-style"
          onPress={() =>
            category === 'Picker'
              ? setPickerStyleIndex((value) => value + 1)
              : setDateStyleIndex((value) => value + 1)
          }
        />
      )}
      <View style={styles.nativeArea}>
        {category === 'Picker' ? (
          <Swift.Picker
            disabled={false}
            label="Favorite Greek letter"
            onSelectionChange={(value) => recordChange('Picker', value)}
            options={pickerOptions}
            pickerStyle={pickerStyle}
            revision={controls.Picker.revision}
            selection={controls.Picker.value as string}
            style={styles.nativeControl}
            testID="one-native-control"
          />
        ) : null}
        {category === 'Date' ? (
          <Swift.DatePicker
            datePickerStyle={datePickerStyle}
            disabled={false}
            displayedComponents="date"
            label="Date"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onSelectionChange={(value) => recordChange('Date', value)}
            revision={controls.Date.revision}
            selection={controls.Date.value as Date}
            style={styles.nativeControl}
            testID="one-native-control"
          />
        ) : null}
        {category === 'Color' ? (
          <>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Allow opacity</Text>
              <Switch
                accessibilityLabel="Allow color opacity"
                onValueChange={setSupportsOpacity}
                testID="one-native-control-supports-opacity"
                value={supportsOpacity}
              />
            </View>
            <Swift.ColorPicker
              disabled={false}
              label="Accent color"
              onSelectionChange={(value) => recordChange('Color', value)}
              revision={controls.Color.revision}
              selection={controls.Color.value as string}
              style={styles.nativeControl}
              supportsOpacity={supportsOpacity}
              testID="one-native-control"
            />
          </>
        ) : null}
        {category === 'Toggle' ? (
          <Swift.Toggle
            disabled={false}
            isOn={controls.Toggle.value as boolean}
            label="Enable notifications"
            onIsOnChange={(value) => recordChange('Toggle', value)}
            revision={controls.Toggle.revision}
            style={styles.nativeControl}
            testID="one-native-control"
            toggleStyle="switch"
          />
        ) : null}
        {category === 'Slider' ? (
          <Swift.Slider
            disabled={false}
            label="Volume"
            maximumValue={100}
            minimumValue={0}
            onValueChange={(value) => recordChange('Slider', value)}
            revision={controls.Slider.revision}
            step={5}
            style={styles.nativeControl}
            testID="one-native-control"
            value={controls.Slider.value as number}
          />
        ) : null}
        {category === 'Stepper' ? (
          <Swift.Stepper
            disabled={false}
            label="Guests"
            maximumValue={10}
            minimumValue={0}
            onValueChange={(value) => recordChange('Stepper', value)}
            revision={controls.Stepper.revision}
            step={1}
            style={styles.nativeControl}
            testID="one-native-control"
            value={controls.Stepper.value as number}
          />
        ) : null}
      </View>

      <Text style={styles.detail}>
        {category === 'Picker'
          ? `Style: ${pickerStyle} · Reject: ${rejectChanges ? 'on' : 'off'}`
          : category === 'Date'
            ? `Style: ${datePickerStyle} · Reject: ${rejectChanges ? 'on' : 'off'}`
            : `Revision: ${control.revision} · Reject: ${rejectChanges ? 'on' : 'off'}`}
      </Text>

      <View style={styles.actions}>
        <View style={styles.action}>
          <Button
            onPress={() =>
              setControls((current) => {
                const updates = current[category].externalUpdates + 1
                let value: ControlState['value']
                switch (category) {
                  case 'Picker':
                    value = ['alpha', 'beta', 'gamma'][updates % 3]
                    break
                  case 'Date':
                    value = new Date(initialDate.getTime() + (updates % 113) * 86_400_000)
                    break
                  case 'Color':
                    value = ['#3366FF', '#FF6633', '#33AA66'][updates % 3]
                    break
                  case 'Toggle':
                    value = !current.Toggle.value
                    break
                  case 'Slider':
                    value = [25, 50, 75, 0][updates % 4]
                    break
                  case 'Stepper':
                    value = (2 + updates) % 11
                    break
                }
                return {
                  ...current,
                  [category]: {
                    ...current[category],
                    value,
                    externalUpdates: updates,
                  },
                }
              })
            }
            testID="one-native-control-external"
            title="External update"
          />
        </View>
        <View style={styles.action}>
          <Button
            onPress={() => setRejectChanges((value) => !value)}
            testID="one-native-control-reject"
            title="Reject changes"
          />
        </View>
        <View style={styles.action}>
          <Button
            onPress={() =>
              setControls((current) => ({
                ...current,
                [category]: {
                  value: initialValues[category],
                  observed: current[category].observed,
                  revision: current[category].revision + 1,
                  externalUpdates: 0,
                },
              }))
            }
            testID="one-native-control-reset"
            title="Reset revision"
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: '#F5F5F7',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  categoryButton: {
    width: '31.9%',
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  selectedCategory: {
    backgroundColor: '#B7D5FF',
  },
  categoryText: {
    color: '#17233A',
    fontSize: 13,
    fontWeight: '600',
  },
  status: {
    marginTop: 7,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    color: '#17233A',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  nativeArea: {
    flexShrink: 1,
    marginTop: 4,
  },
  nativeControl: {
    width: '100%',
  },
  optionRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  optionLabel: {
    color: '#17233A',
    fontSize: 13,
  },
  detail: {
    marginTop: 2,
    color: '#4A5365',
    fontSize: 11,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
    paddingBottom: 6,
  },
  action: {
    flex: 1,
  },
})
