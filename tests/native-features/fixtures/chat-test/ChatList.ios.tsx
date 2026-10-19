import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One, useRouter } from 'one'
import { useCellList, sweep } from './cells'
import { chats, initials, type Chat } from './data'
import { describe, Measured, PerfStrip, usePerf } from './perf'

// the chat list on a UIKit collection. every row is React content in a native cell;
// windowed mode mounts only rows near what UIKit displays, all mode mounts every row
const counts = [1000, 5000, 20000]
const rowHeight = 76

function Row({ chat, onPress }: { chat: Chat; onPress: () => void }) {
  return (
    <Pressable testID={`chat-test-row-${chat.id}`} onPress={onPress} style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: chat.color }]}>
        <Text style={styles.initials}>{initials(chat.name)}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <Text style={styles.name} numberOfLines={1}>
            {chat.name}
            {chat.muted ? ' 🔕' : ''}
          </Text>
          <Text style={styles.time}>{chat.time}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.preview} numberOfLines={2}>
            {chat.preview}
          </Text>
          {chat.unread > 0 ? (
            <View style={[styles.pill, chat.muted && styles.mutedPill]}>
              <Text style={styles.pillText}>{chat.unread}</Text>
            </View>
          ) : chat.pinned ? (
            <Text style={styles.pin}>📌</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

export default function ChatList() {
  const router = useRouter()
  const [count, setCount] = useState(5000)
  const [windowed, setWindowed] = useState(true)
  const [sweeping, setSweeping] = useState('idle')
  const list = useMemo(() => chats(count), [count])
  const ids = useMemo(() => list.map((chat) => chat.id), [list])
  const cells = useCellList({ ids, estimate: rowHeight, windowed, overscan: 40 })
  const perf = usePerf()

  const read = useCallback(
    () =>
      `${count} chats, ${windowed ? `window ${cells.range.start}-${cells.range.end}` : 'all mounted'}; blank ${cells.stats.current.blank}/${cells.stats.current.displayed}; ${describe(perf.sample.current)}`,
    [count, windowed, cells.range, cells.stats, perf.sample]
  )

  const run = async () => {
    if (!cells.collection) return
    perf.reset()
    cells.resetStats()
    setSweeping('down')
    const started = Date.now()
    await sweep(cells.collection, Math.min(count, 2000), 25, true)
    setSweeping(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  }

  const status = cells.error ?? (cells.ready ? 'ready' : 'loading')

  return (
    <View style={styles.screen}>
      <PerfStrip testID="chat-test-perf" read={read} />
      <View style={styles.controls}>
        <Text testID="chat-test-status">{`Status: ${status}; sweep ${sweeping}`}</Text>
        {counts.map((value) => (
          <Pressable
            key={value}
            testID={`chat-test-count-${value}`}
            onPress={() => setCount(value)}
          >
            <Text style={value === count ? styles.active : undefined}>{value}</Text>
          </Pressable>
        ))}
        <Pressable
          testID="chat-test-windowed"
          onPress={() => setWindowed((value) => !value)}
        >
          <Text>{windowed ? 'Windowed' : 'All mounted'}</Text>
        </Pressable>
        <Pressable testID="chat-test-sweep" onPress={() => void run()}>
          <Text>Sweep</Text>
        </Pressable>
        <Pressable
          testID="chat-test-reset"
          onPress={() => (perf.reset(), cells.resetStats())}
        >
          <Text>Reset</Text>
        </Pressable>
      </View>
      {cells.collection && (
        <One.iOS.UIKitView
          view={cells.collection}
          testID="chat-test-list"
          style={styles.list}
        />
      )}
      <Measured id="chat-rows" onRender={perf.onRender}>
        {cells.source &&
          list.map((chat, index) =>
            cells.mounted(index) ? (
              <One.iOS.UIKitContent
                key={chat.id}
                source={cells.source!}
                item={chat.id}
                height={rowHeight}
              >
                <Row
                  chat={chat}
                  onPress={() => router.push(`/chat-test-conversation?chat=${chat.id}`)}
                />
              </One.iOS.UIKitContent>
            ) : null
          )}
      </Measured>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 12 },
  active: { fontWeight: '700', textDecorationLine: 'underline' },
  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    height: rowHeight,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#fff', fontWeight: '700', fontSize: 18 },
  body: {
    flex: 1,
    height: rowHeight,
    justifyContent: 'center',
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d5db',
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontWeight: '600', fontSize: 16 },
  time: { color: '#6b7280', fontSize: 13 },
  preview: { flex: 1, color: '#6b7280', fontSize: 14 },
  pill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedPill: { backgroundColor: '#9ca3af' },
  pillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  pin: { fontSize: 12 },
})
