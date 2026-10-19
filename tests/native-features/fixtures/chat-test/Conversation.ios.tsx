import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One, useLocalSearchParams } from 'one'
import { useCellList, sweep } from './cells'
import { messages, type Message } from './data'
import { describe, Measured, PerfStrip, usePerf } from './perf'

// one conversation's messages on a UIKit collection, opened at the newest message.
// bubbles size themselves, so this exercises self-sizing cells during a scroll
const count = 10000

function Bubble({ message }: { message: Message }) {
  return (
    <View
      testID={`chat-test-message-${message.id}`}
      style={[
        styles.slot,
        message.mine ? styles.mineSlot : styles.theirSlot,
        message.head && styles.head,
      ]}
    >
      <View style={[styles.bubble, message.mine ? styles.mine : styles.theirs]}>
        <Text style={message.mine ? styles.mineText : styles.theirText}>
          {message.text}
        </Text>
        <Text style={[styles.time, message.mine && styles.mineTime]}>
          {message.time}
          {message.mine ? ' ✓✓' : ''}
        </Text>
      </View>
    </View>
  )
}

export default function Conversation() {
  const params = useLocalSearchParams<{ chat?: string }>()
  const chat = Number(params.chat ?? 1)
  const [windowed, setWindowed] = useState(true)
  const [sweeping, setSweeping] = useState('idle')
  const list = useMemo(() => messages(chat, count), [chat])
  const ids = useMemo(() => list.map((message) => message.id), [list])
  const cells = useCellList({
    ids,
    estimate: 56,
    windowed,
    overscan: 30,
    startAtEnd: true,
  })
  const perf = usePerf()

  const read = useCallback(
    () =>
      `${count} messages, ${windowed ? `window ${cells.range.start}-${cells.range.end}` : 'all mounted'}; blank ${cells.stats.current.blank}/${cells.stats.current.displayed}; ${describe(perf.sample.current)}`,
    [windowed, cells.range, cells.stats, perf.sample]
  )

  const run = async () => {
    if (!cells.collection) return
    perf.reset()
    cells.resetStats()
    setSweeping('up')
    const started = Date.now()
    // scroll back through recent history, the way a reader would
    await sweep(cells.collection, count, 20, false)
    setSweeping(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  }

  const status = cells.error ?? (cells.ready ? 'ready' : 'loading')

  return (
    <View style={styles.screen}>
      <PerfStrip testID="chat-test-conversation-perf" read={read} />
      <View style={styles.controls}>
        <Text testID="chat-test-conversation-status">{`Status: ${status}; sweep ${sweeping}`}</Text>
        <Pressable
          testID="chat-test-conversation-windowed"
          onPress={() => setWindowed((value) => !value)}
        >
          <Text>{windowed ? 'Windowed' : 'All mounted'}</Text>
        </Pressable>
        <Pressable testID="chat-test-conversation-sweep" onPress={() => void run()}>
          <Text>Sweep</Text>
        </Pressable>
      </View>
      {cells.collection && (
        <One.iOS.UIKitView
          view={cells.collection}
          testID="chat-test-conversation-list"
          style={styles.list}
        />
      )}
      <Measured id="chat-messages" onRender={perf.onRender}>
        {cells.source &&
          list.map((message, index) =>
            cells.mounted(index) ? (
              <One.iOS.UIKitContent
                key={message.id}
                source={cells.source!}
                item={message.id}
                estimatedHeight={56}
              >
                <Bubble message={message} />
              </One.iOS.UIKitContent>
            ) : null
          )}
      </Measured>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e7ded5' },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  list: { flex: 1 },
  slot: { paddingHorizontal: 10, paddingVertical: 2 },
  head: { paddingTop: 8 },
  mineSlot: { alignItems: 'flex-end' },
  theirSlot: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 2,
  },
  mine: { backgroundColor: '#dcf8c6' },
  theirs: { backgroundColor: '#fff' },
  mineText: { color: '#111827', fontSize: 16 },
  theirText: { color: '#111827', fontSize: 16 },
  time: { alignSelf: 'flex-end', fontSize: 11, color: '#6b7280' },
  mineTime: { color: '#4d7c0f' },
})
