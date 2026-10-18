import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// native runs each schedule and reports an entry's date and cadence; the content
// closure runs with them. the periodic leg steps every second, so the status line
// counts the entries native delivered. the explicit leg lists an hour ago and two
// moments after mount, and shows the entries SwiftUI delivered in order: it starts on
// the past one and steps to the next as it arrives. SwiftUI ends the timeline at the
// last date, so that one never runs. the invalid leg stays
// unmounted until its pressable runs.

function EntryCounter({
  date,
  cadence,
  onEntry,
}: {
  date: Date
  cadence: string
  onEntry: (date: Date, cadence: string) => void
}) {
  useEffect(() => {
    onEntry(date, cadence)
  }, [date, cadence, onEntry])
  return <One.iOS.Text text={`tick ${date.getUTCSeconds()} ${cadence}`} />
}

// the explicit entries in the order native delivered them
function ExplicitTrail({ entry }: { entry: number }) {
  const [trail, setTrail] = useState<number[]>([])
  useEffect(() => {
    setTrail((seen) => (seen.at(-1) === entry ? seen : [...seen, entry]))
  }, [entry])
  return <One.iOS.Text text={`explicit entries ${trail.join(' ')}`} />
}

export default function OneNativeTimelineView() {
  const [entries, setEntries] = useState(0)
  const [cadence, setCadence] = useState('none')
  const [invalid, setInvalid] = useState(false)
  const start = useRef(new Date())
  const explicitDates = useRef(
    // whole seconds, so a date survives the trip through native's Double exactly
    [-3_600_000, 3_000, 6_000].map(
      (offset) => new Date(Math.floor(start.current.getTime() / 1000) * 1000 + offset)
    )
  ).current
  const onEntry = useRef((_date: Date, next: string) => {
    setEntries((count) => count + 1)
    setCadence(next)
  }).current

  return (
    <View style={styles.screen} testID="one-native-timeline-view-screen">
      <Pressable
        accessibilityRole="button"
        style={styles.action}
        testID="one-native-timeline-view-invalid"
        onPress={() => setInvalid(true)}
      >
        <Text style={styles.actionText}>Invalid schedule</Text>
      </Pressable>
      <Text testID="one-native-timeline-view-status" style={styles.statusText}>
        {`Entries: ${entries} · Cadence: ${cadence}`}
      </Text>
      <One.iOS.TimelineView
        schedule={{ type: 'periodic', from: start.current, by: 1 }}
        testID="one-native-timeline-view-periodic"
      >
        {(context) => (
          <EntryCounter date={context.date} cadence={context.cadence} onEntry={onEntry} />
        )}
      </One.iOS.TimelineView>
      <One.iOS.TimelineView
        schedule={{ type: 'explicit', dates: explicitDates }}
        testID="one-native-timeline-view-explicit"
      >
        {(context) => (
          <ExplicitTrail
            entry={explicitDates.findIndex((date) => date.getTime() === context.date.getTime())}
          />
        )}
      </One.iOS.TimelineView>
      {invalid ? (
        <Boundary testID="one-native-timeline-view-schedule-error">
          <One.iOS.TimelineView schedule={'hourly' as never}>
            {() => <One.iOS.Text text="never" />}
          </One.iOS.TimelineView>
        </Boundary>
      ) : null}
    </View>
  )
}

class Boundary extends Component<{ children: ReactNode; testID: string }, { error: string }> {
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
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, gap: 8, backgroundColor: '#F5F5F7' },
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
})
