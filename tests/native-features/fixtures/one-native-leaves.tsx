import { useState } from 'react'
import { Swift } from 'one-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const categories = ['Button', 'Progress', 'Gauge', 'Text', 'Secure'] as const
const buttonStyles = [
  'automatic',
  'bordered',
  'borderedProminent',
  'plain',
  'glass',
] as const
const progressStyles = ['automatic', 'linear', 'circular'] as const
const gaugeStyles = ['automatic', 'linearCapacity', 'accessoryCircular'] as const
const initialText = { text: '', observed: '', revision: 0, reject: false, submits: 0 }

export default function OneNativeLeaves() {
  const [category, setCategory] = useState<(typeof categories)[number]>('Button')
  const [presses, setPresses] = useState(0)
  const [disabled, setDisabled] = useState(false)
  const [destructive, setDestructive] = useState(false)
  const [buttonStyleIndex, setButtonStyleIndex] = useState(0)
  const [progress, setProgress] = useState<number | undefined>(0)
  const [progressStyleIndex, setProgressStyleIndex] = useState(0)
  const [gauge, setGauge] = useState(0)
  const [gaugeStyleIndex, setGaugeStyleIndex] = useState(0)
  const [fields, setFields] = useState({ Text: initialText, Secure: initialText })
  const [vertical, setVertical] = useState(false)
  const fieldCategory = category === 'Secure' ? 'Secure' : 'Text'
  const field = fields[fieldCategory]
  const isText = category === 'Text' || category === 'Secure'
  const buttonStyle = buttonStyles[buttonStyleIndex % buttonStyles.length]
  const progressViewStyle = progressStyles[progressStyleIndex % progressStyles.length]
  const gaugeStyle = gaugeStyles[gaugeStyleIndex % gaugeStyles.length]
  const textProps = {
    text: field.text,
    revision: field.revision,
    onTextChange: (text: string) =>
      setFields((current) => ({
        ...current,
        [fieldCategory]: {
          ...current[fieldCategory],
          text: current[fieldCategory].reject ? current[fieldCategory].text : text,
          observed: text,
        },
      })),
    onSubmit: () =>
      setFields((current) => ({
        ...current,
        [fieldCategory]: {
          ...current[fieldCategory],
          submits: current[fieldCategory].submits + 1,
        },
      })),
    prompt: 'Type a leaf note',
    submitLabel: 'done' as const,
    textFieldStyle: 'roundedBorder' as const,
    textInputAutocapitalization: 'never' as const,
    autocorrectionDisabled: true,
    style: styles.nativeControl,
  }
  const status: [string, string | number][] = [
    ['Category', category],
    ...(category === 'Button'
      ? ([
          ['Presses', presses],
          ['Disabled', String(disabled)],
          ['Style', buttonStyle],
          ['Role', destructive ? 'destructive' : 'unset'],
        ] as [string, string | number][])
      : []),
    ...(category === 'Progress'
      ? ([
          ['Value', progress === undefined ? 'indeterminate' : progress],
          ['Style', progressViewStyle],
        ] as [string, string | number][])
      : []),
    ...(category === 'Gauge'
      ? ([
          ['Value', gauge],
          ['Style', gaugeStyle],
        ] as [string, string | number][])
      : []),
    ...(isText
      ? ([
          // report exact secure state without leaking plaintext into the AX tree.
          [
            'Value',
            category === 'Secure'
              ? `codes:${Array.from(field.text, (c) => c.codePointAt(0)).join(',')}`
              : field.text,
          ],
          [
            'Request',
            category === 'Secure'
              ? `codes:${Array.from(field.observed, (c) => c.codePointAt(0)).join(',')}`
              : field.observed,
          ],
          ['Reject', field.reject ? 'on' : 'off'],
          ['Revision', field.revision],
          ['Submits', field.submits],
          ...(category === 'Text'
            ? [['Axis', vertical ? 'vertical' : 'horizontal']]
            : []),
        ] as [string, string | number][])
      : []),
  ]

  return (
    <View style={styles.screen} testID="one-native-leaves-screen">
      <View style={styles.row}>
        {categories.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            style={[styles.action, category === item && styles.selected]}
            testID={`one-native-leaf-category-${item.toLowerCase()}`}
            onPress={() => setCategory(item)}
          >
            <Text style={styles.actionText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.status}>
        {status.map(([label, value]) => (
          <Text
            key={label}
            style={styles.statusText}
            testID={`one-native-leaf-${label.toLowerCase()}`}
          >{`${label}: ${value}`}</Text>
        ))}
      </View>
      <View style={styles.nativeArea}>
        {category === 'Button' ? (
          <>
            <Swift.Button
              label="Press leaf"
              disabled={disabled}
              buttonStyle={buttonStyle}
              buttonRole={destructive ? 'destructive' : ''}
              onPress={() => setPresses((count) => count + 1)}
              style={styles.nativeControl}
              testID="one-native-leaf-button"
            />
            <Swift.Button
              label="Star leaf"
              systemImage="star.fill"
              onPress={() => setPresses((count) => count + 1)}
              style={styles.nativeControl}
              testID="one-native-leaf-image-button"
            />
          </>
        ) : null}
        {category === 'Progress' ? (
          <Swift.ProgressView
            label="Leaf progress"
            value={progress}
            total={1}
            progressViewStyle={progressViewStyle}
            style={styles.nativeControl}
            testID="one-native-leaf-progress"
          />
        ) : null}
        {category === 'Gauge' ? (
          <Swift.Gauge
            label="Leaf gauge"
            value={gauge}
            minimumValue={0}
            maximumValue={100}
            currentValueLabel={String(gauge)}
            minimumValueLabel="0"
            maximumValueLabel="100"
            gaugeStyle={gaugeStyle}
            style={styles.nativeControl}
            testID="one-native-leaf-gauge"
          />
        ) : null}
        {category === 'Text' ? (
          <Swift.TextField
            {...textProps}
            label="Leaf text"
            axis={vertical ? 'vertical' : 'horizontal'}
            testID="one-native-leaf-text"
          />
        ) : null}
        {category === 'Secure' ? (
          <Swift.SecureField
            {...textProps}
            label="Leaf secret"
            testID="one-native-leaf-secure"
          />
        ) : null}
      </View>
      <View style={styles.row}>
        {category === 'Button' ? (
          <>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-leaf-toggle-disabled"
              onPress={() => setDisabled((v) => !v)}
            >
              <Text style={styles.actionText}>Toggle disabled</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-leaf-cycle-style"
              onPress={() => setButtonStyleIndex((v) => v + 1)}
            >
              <Text style={styles.actionText}>Change style</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-leaf-toggle-role"
              onPress={() => setDestructive((v) => !v)}
            >
              <Text style={styles.actionText}>Toggle role</Text>
            </Pressable>
          </>
        ) : null}
        {category === 'Progress' ? (
          <>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-leaf-step"
              onPress={() =>
                setProgress((v) => (v === undefined || v === 1 ? 0 : v + 0.5))
              }
            >
              <Text style={styles.actionText}>Step value</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-leaf-indeterminate"
              onPress={() => setProgress(undefined)}
            >
              <Text style={styles.actionText}>Indeterminate</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-leaf-cycle-style"
              onPress={() => setProgressStyleIndex((v) => v + 1)}
            >
              <Text style={styles.actionText}>Change style</Text>
            </Pressable>
          </>
        ) : null}
        {category === 'Gauge' ? (
          <>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-leaf-step"
              onPress={() => setGauge((v) => (v + 50) % 150)}
            >
              <Text style={styles.actionText}>Step value</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-leaf-cycle-style"
              onPress={() => setGaugeStyleIndex((v) => v + 1)}
            >
              <Text style={styles.actionText}>Change style</Text>
            </Pressable>
          </>
        ) : null}
        {isText ? (
          <>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-leaf-reject"
              onPress={() =>
                setFields((current) => ({
                  ...current,
                  [fieldCategory]: {
                    ...current[fieldCategory],
                    reject: !current[fieldCategory].reject,
                  },
                }))
              }
            >
              <Text style={styles.actionText}>Reject edits</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-leaf-external"
              onPress={() =>
                setFields((current) => ({
                  ...current,
                  [fieldCategory]: { ...current[fieldCategory], text: 'outside' },
                }))
              }
            >
              <Text style={styles.actionText}>External set</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-leaf-reset"
              onPress={() =>
                setFields((current) => ({
                  ...current,
                  [fieldCategory]: {
                    ...current[fieldCategory],
                    text: '',
                    revision: current[fieldCategory].revision + 1,
                  },
                }))
              }
            >
              <Text style={styles.actionText}>Reset revision</Text>
            </Pressable>
            {category === 'Text' ? (
              <Pressable
                accessibilityRole="button"
                style={styles.action}
                testID="one-native-leaf-axis-toggle"
                onPress={() => setVertical((v) => !v)}
              >
                <Text style={styles.actionText}>Toggle axis</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#F5F5F7' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  action: {
    minHeight: 34,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  selected: { backgroundColor: '#B7D5FF' },
  actionText: { color: '#17233A', fontSize: 12, fontWeight: '600' },
  status: { marginTop: 6, padding: 6, borderRadius: 8, backgroundColor: '#FFFFFF' },
  statusText: { color: '#17233A', fontSize: 11, fontVariant: ['tabular-nums'] },
  nativeArea: { height: 110, width: '100%', justifyContent: 'center', gap: 8 },
  nativeControl: { width: '100%' },
})
