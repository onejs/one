import React from 'react'
import ReactFabric from 'react-native/Libraries/Renderer/implementations/ReactFabric-prod'
import { roots } from 'react-native/react-private-interface'

const log = typeof print === 'function' ? print : console.log
const now = () => performance.now()
const h = React.createElement
const { memo, useState, useMemo, useContext, createContext } = React

const Theme = createContext({ color: 'black', size: 14 })

function Text(props) {
  const theme = useContext(Theme)
  return h('RCTText', { style: { color: theme.color, fontSize: theme.size, fontWeight: props.bold ? 'bold' : 'normal' } }, props.children)
}

const Badge = memo(function Badge({ count }) {
  return h('RCTView', { style: { padding: 4, borderRadius: 8, backgroundColor: count > 50 ? 'red' : 'gray' } }, h(Text, null, String(count)))
})

function Row({ item, selected }) {
  const [open] = useState(false)
  const label = useMemo(() => item.title + ' #' + item.id, [item.title, item.id])
  return h(
    'RCTView',
    { label, style: { flexDirection: 'row', padding: 8, backgroundColor: selected ? 'blue' : 'white', opacity: open ? 1 : 0.9 } },
    h('RCTView', { style: { width: 40, height: 40, borderRadius: 20 } }),
    h('RCTView', { style: { flex: 1 } }, h(Text, { bold: selected }, label), h(Text, null, item.subtitle)),
    h(Badge, { count: item.count })
  )
}

function App({ items, selected, theme }) {
  return h(Theme.Provider, { value: theme }, h('RCTView', { style: { flex: 1 } }, items.map((item) => h(Row, { key: item.id, item, selected: item.id === selected }))))
}

function makeItems(n, seed) {
  const items = []
  for (let i = 0; i < n; i++) items.push({ id: i, title: 'Item ' + i, subtitle: 'subtitle ' + ((i * 7 + seed) % 13), count: (i * 31 + seed * 17) % 100 })
  return items
}

// a legacy root commits synchronously, so each render is one full render and commit
const render = (el) => ReactFabric.render(el, 1, null, false)

const N = 1000
const MOUNTS = Number(globalThis.MOUNTS || 30)
const UPDATES = Number(globalThis.UPDATES || 300)

let t0 = now()
for (let m = 0; m < MOUNTS; m++) {
  render(h(App, { items: makeItems(N, m), selected: -1, theme: { color: 'black', size: 14 } }))
  render(null)
}
const mountMs = now() - t0

render(h(App, { items: makeItems(N, 0), selected: 0, theme: { color: 'black', size: 14 } }))
let items = makeItems(N, 0)
t0 = now()
for (let u = 0; u < UPDATES; u++) {
  const next = items.slice()
  for (let i = u % 10; i < N; i += 10) next[i] = { ...next[i], count: (next[i].count + 1) % 100 }
  if (u % 50 === 25) next.reverse()
  items = next
  render(h(App, { items, selected: u % N, theme: u % 100 === 99 ? { color: 'gray', size: 15 } : { color: 'black', size: 14 } }))
}
const updateMs = now() - t0

let nodes = 0
const count = (n) => {
  nodes++
  for (const c of n.children) count(c)
}
for (const c of roots.get(1)) count(c)
log('mount_ms=' + Math.round(mountMs) + ' update_ms=' + Math.round(updateMs) + ' nodes=' + nodes)
