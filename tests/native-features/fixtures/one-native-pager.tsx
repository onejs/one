import { useRef, useState } from 'react'
import { One, type PagerRef, type PagerScrollEvent } from 'one'
import { Pressable, Text, TextInput, View } from 'react-native'
import PagerBaseline from '../components/PagerBaseline'

const colors = ['#fde68a', '#bae6fd', '#bbf7d0', '#fecaca']
export default function PagerFixture() {
  const pager = useRef<PagerRef>(null)
  const [baseline, setBaseline] = useState(false)
  const [vertical, setVertical] = useState(false)
  const [rtl, setRTL] = useState(false)
  const [compact, setCompact] = useState(false)
  const [count, setCount] = useState(4)
  const [enabled, setEnabled] = useState(true)
  const [overdrag, setOverdrag] = useState(false)
  const [margin, setMargin] = useState(0)
  const [selected, setSelected] = useState(1)
  const [state, setState] = useState('idle')
  const [report, setReport] = useState('ready')
  const stats = useRef({
    dragging: false,
    count: 0,
    first: 0,
    last: 0,
    cost: 0,
    progress: 1,
    fractional: false,
    samples: [] as number[],
  })
  // both components receive the same handler. no per-event render, timer or frame.
  function onScroll({ nativeEvent }: PagerScrollEvent) {
    const now = performance.now()
    const s = stats.current
    s.progress = nativeEvent.position + nativeEvent.offset
    s.fractional ||= nativeEvent.offset > 0 && nativeEvent.offset < 1
    if (!s.dragging) return
    if (!s.first) s.first = now
    s.last = now
    s.count++
  }
  function recordCost(cost: number) {
    if (!stats.current.dragging) return
    stats.current.cost += cost
    stats.current.samples.push(cost)
  }
  function measuredScroll(event: PagerScrollEvent) {
    const start = performance.now()
    onScroll(event)
    recordCost(performance.now() - start)
  }
  const Component = baseline ? PagerBaseline : One.UI.Pager
  const controls = [
    ['page 0', () => pager.current?.setPage(0)],
    ['page 3', () => pager.current?.setPage(3)],
    ['instant 2', () => pager.current?.setPageWithoutAnimation(2)],
    ['invalid 99', () => pager.current?.setPage(99)],
    ['vertical', () => setVertical(!vertical)],
    ['rtl', () => setRTL(!rtl)],
    ['resize', () => setCompact(!compact)],
    ['remove last', () => setCount(count === 4 ? 3 : 4)],
    [
      'scroll',
      () => {
        pager.current?.setScrollEnabled(!enabled)
        setEnabled(!enabled)
      },
    ],
    ['overdrag', () => setOverdrag(!overdrag)],
    ['margin', () => setMargin(margin ? 0 : 12)],
    [
      'baseline',
      () => {
        setBaseline(!baseline)
        setSelected(1)
      },
    ],
    [
      'reset stats',
      () => {
        setReport('ready')
        stats.current = {
          dragging: false,
          count: 0,
          first: 0,
          last: 0,
          cost: 0,
          progress: selected,
          fractional: false,
          samples: [],
        }
      },
    ],
    [
      'report',
      () => {
        const s = stats.current
        const sorted = [...s.samples].sort((a, b) => a - b)
        setReport(
          JSON.stringify({
            component: baseline ? 'pager-view 8.0.5' : 'One.UI.Pager',
            events: s.count,
            eps: s.count > 1 ? ((s.count - 1) * 1000) / (s.last - s.first) : 0,
            meanUs: s.count ? (s.cost * 1000) / s.count : 0,
            p95Us: (sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 1000,
            progress: s.progress,
            fractional: s.fractional,
          })
        )
      },
    ],
  ] as const
  return (
    <View
      testID="one-ui-pager-root"
      style={{
        flex: 1,
        paddingTop: 64,
        paddingHorizontal: 16,
        paddingBottom: 24,
        gap: 8,
        backgroundColor: 'white',
      }}
    >
      <Text>{baseline ? 'pager-view 8.0.5' : 'One.UI.Pager'}</Text>
      <Text testID="one-ui-pager-selected">selected:{selected}</Text>
      <Text testID="one-ui-pager-state">state:{state}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {controls.map(([label, action]) => (
          <Pressable
            key={label}
            testID={`one-ui-pager-${label.replaceAll(' ', '-')}`}
            onPress={action}
            style={{ padding: 8, backgroundColor: '#e2e8f0' }}
          >
            <Text>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text testID="one-ui-pager-report">{report}</Text>
      <Component
        key={baseline ? 'baseline' : 'one'}
        ref={pager}
        testID="one-ui-pager-stage"
        initialPage={1}
        orientation={vertical ? 'vertical' : 'horizontal'}
        layoutDirection={rtl ? 'rtl' : 'ltr'}
        scrollEnabled={enabled}
        overdrag={overdrag}
        pageMargin={margin}
        keyboardDismissMode="on-drag"
        onPageScroll={baseline ? onScroll : measuredScroll}
        {...(baseline ? { onScrollCost: recordCost } : {})}
        onPageSelected={({ nativeEvent }) => setSelected(nativeEvent.position)}
        onPageScrollStateChanged={({ nativeEvent }) => {
          stats.current.dragging = nativeEvent.pageScrollState === 'dragging'
          setState(nativeEvent.pageScrollState)
        }}
        style={{ flex: 1, width: compact ? 260 : '100%', alignSelf: 'center' }}
      >
        {colors.slice(0, count).map((color, index) => (
          <View
            key={color}
            testID={`one-ui-pager-slide-${index}`}
            style={{
              flex: 1,
              backgroundColor: color,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text>page {index}</Text>
            <TextInput
              testID={`one-ui-pager-input-${index}`}
              placeholder="keyboard probe"
              style={{ backgroundColor: 'white', padding: 12, width: 220 }}
            />
          </View>
        ))}
      </Component>
    </View>
  )
}
