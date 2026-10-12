import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One, type ScrollViewProxy } from 'one'

// the reader runs its content closure with a ScrollViewProxy; rows carry
// swiftStyle.id, the SDK's .id(_:). the scroll view reports its content offset
// through the SDK's onScrollGeometryChange, so the status line shows where
// proxy.scrollTo really moved it. the pressables sit outside the reader and use
// the proxy the builder handed out, the way a SwiftUI action stores one. the
// mount leg scrolls from an effect on first mount, before SwiftUI has shown the
// reader; the error legs stay unmounted until their pressables run.
const rows = Array.from({ length: 40 }, (_, index) => index)

function Rows({ testID, onOffset }: { testID: string; onOffset: (y: number) => void }) {
  return (
    <One.iOS.ScrollView
      testID={testID}
      style={styles.scroll}
      swiftStyle={{
        onScrollGeometryChangeWithContentOffset: ({ newValue }) => onOffset(newValue.y),
      }}
    >
      <One.iOS.VStack spacing={0}>
        {rows.map((index) => (
          <One.iOS.Text
            key={index}
            text={`Row ${index}`}
            swiftStyle={{ id: `row-${index}`, height: 40 }}
          />
        ))}
      </One.iOS.VStack>
    </One.iOS.ScrollView>
  )
}

function MountScroll() {
  const [offset, setOffset] = useState(0)
  return (
    <View>
      <Text testID="one-native-scroll-reader-mount-status" style={styles.statusText}>
        {`Mount offset: ${Math.round(offset)}`}
      </Text>
      <One.iOS.ScrollViewReader style={styles.reader}>
        {(proxy) => (
          <>
            <ScrollOnMount proxy={proxy} />
            <Rows testID="one-native-scroll-reader-mount-view" onOffset={setOffset} />
          </>
        )}
      </One.iOS.ScrollViewReader>
    </View>
  )
}

function ScrollOnMount({ proxy }: { proxy: ScrollViewProxy }) {
  useEffect(() => proxy.scrollTo('row-20', 'top'), [proxy])
  return null
}

function ScrollWhileBuilding() {
  return (
    <One.iOS.ScrollViewReader style={styles.reader}>
      {(proxy) => {
        proxy.scrollTo('row-0')
        return (
          <Rows testID="one-native-scroll-reader-building-view" onOffset={() => {}} />
        )
      }}
    </One.iOS.ScrollViewReader>
  )
}

export default function OneNativeScrollReader() {
  const proxy = useRef<ScrollViewProxy | null>(null)
  const [offset, setOffset] = useState(0)
  const [last, setLast] = useState('none')
  const [anchorError, setAnchorError] = useState('')
  const [mount, setMount] = useState(false)
  const [building, setBuilding] = useState(false)

  const scroll = (id: string, anchor?: 'top' | 'bottom') => {
    proxy.current!.scrollTo(id, anchor)
    setLast(`${id} ${anchor ?? 'nil'}`)
  }

  return (
    <View style={styles.screen} testID="one-native-scroll-reader-screen">
      <View style={styles.row}>
        <Action
          testID="one-native-scroll-reader-bottom"
          label="row-29 bottom"
          onPress={() => scroll('row-29', 'bottom')}
        />
        <Action
          testID="one-native-scroll-reader-top"
          label="row-0 top"
          onPress={() => scroll('row-0', 'top')}
        />
        <Action
          testID="one-native-scroll-reader-nil"
          label="row-39 nil"
          onPress={() => scroll('row-39')}
        />
        <Action
          testID="one-native-scroll-reader-visible"
          label="row-29 nil"
          onPress={() => scroll('row-29')}
        />
        <Action
          testID="one-native-scroll-reader-missing"
          label="missing"
          onPress={() => scroll('missing', 'top')}
        />
        <Action
          testID="one-native-scroll-reader-invalid-anchor"
          label="bad anchor"
          onPress={() => {
            try {
              proxy.current!.scrollTo('row-5', 'middle' as never)
            } catch (error) {
              setAnchorError(error instanceof Error ? error.message : String(error))
            }
          }}
        />
        <Action
          testID="one-native-scroll-reader-mount"
          label="mount leg"
          onPress={() => setMount(true)}
        />
        <Action
          testID="one-native-scroll-reader-building"
          label="build leg"
          onPress={() => setBuilding(true)}
        />
      </View>
      <Text testID="one-native-scroll-reader-status" style={styles.statusText}>
        {`Offset: ${Math.round(offset)} · Last: ${last}`}
      </Text>
      {anchorError ? (
        <Text testID="one-native-scroll-reader-anchor-error" style={styles.statusText}>
          {`Error: ${anchorError}`}
        </Text>
      ) : null}
      <One.iOS.ScrollViewReader
        style={styles.reader}
        testID="one-native-scroll-reader-view"
      >
        {(value) => {
          proxy.current = value
          return <Rows testID="one-native-scroll-reader-scroll" onOffset={setOffset} />
        }}
      </One.iOS.ScrollViewReader>
      {mount ? <MountScroll /> : null}
      {building ? (
        <Boundary testID="one-native-scroll-reader-building-error">
          <ScrollWhileBuilding />
        </Boundary>
      ) : null}
    </View>
  )
}

function Action({
  testID,
  label,
  onPress,
}: {
  testID: string
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={styles.action}
      testID={testID}
      onPress={onPress}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  )
}

class Boundary extends Component<
  { children: ReactNode; testID: string },
  { error: string }
> {
  state = { error: '' }
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <View>
        <Text testID={this.props.testID} style={styles.statusText}>
          {`Error: ${this.state.error}`}
        </Text>
      </View>
    )
  }
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
  actionText: { color: '#17233A', fontSize: 12, fontWeight: '600' },
  statusText: { color: '#17233A', fontSize: 11, fontVariant: ['tabular-nums'] },
  reader: { height: 200 },
  scroll: { flex: 1 },
})
