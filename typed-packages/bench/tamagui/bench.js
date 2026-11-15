import React from 'react'
import ReactFabric from 'react-native/Libraries/Renderer/implementations/ReactFabric-prod'
import { roots } from 'react-native/react-private-interface'
import { createTamagui, styled, Text, TamaguiProvider, Theme, View } from '@tamagui/core'

const log = typeof print === 'function' ? print : console.log
const now = () => performance.now()
const h = React.createElement
const { memo, useState, useMemo } = React

const config = createTamagui({
  tokens: {
    size: { 0: 0, 1: 4, 2: 8, 3: 16, 4: 40, true: 16 },
    space: { 0: 0, 1: 4, 2: 8, 3: 16, true: 8 },
    radius: { 0: 0, 1: 4, 2: 8, 3: 20, true: 8 },
    zIndex: { 0: 0, 1: 100 },
    color: { white: '#fff', black: '#000', blue: '#04f', gray: '#888', red: '#e00' },
  },
  themes: {
    light: { background: '#fff', color: '#000', selected: '#04f', badge: '#888', badgeHot: '#e00' },
    dark: { background: '#000', color: '#fff', selected: '#4af', badge: '#444', badgeHot: '#f44' },
  },
  shorthands: { p: 'padding', bg: 'backgroundColor', br: 'borderRadius', f: 'flex' },
})

const Row = styled(View, {
  flexDirection: 'row',
  p: '$2',
  bg: '$background',
  opacity: 0.9,
  variants: { selected: { true: { bg: '$selected', opacity: 1 } } },
})
const Avatar = styled(View, { width: '$4', height: '$4', br: '$3', bg: '$badge' })
const Body = styled(View, { f: 1 })
const Label = styled(Text, { color: '$color', fontSize: 14, variants: { bold: { true: { fontWeight: 'bold' } } } })
const BadgeBox = styled(View, { p: '$1', br: '$2', bg: '$badge', variants: { hot: { true: { bg: '$badgeHot' } } } })

const Badge = memo(function Badge({ count }) {
  return h(BadgeBox, { hot: count > 50 }, h(Label, null, String(count)))
})

function Item({ item, selected }) {
  const [open] = useState(false)
  const label = useMemo(() => item.title + ' #' + item.id, [item.title, item.id])
  return h(
    Row,
    { selected, testID: label, opacity: open ? 1 : undefined },
    h(Avatar),
    h(Body, null, h(Label, { bold: selected }, label), h(Label, null, item.subtitle)),
    h(Badge, { count: item.count })
  )
}

function App({ items, selected, theme }) {
  return h(TamaguiProvider, { config, defaultTheme: 'light' }, h(Theme, { name: theme }, h(View, { f: 1 }, items.map((item) => h(Item, { key: item.id, item, selected: item.id === selected })))))
}

function makeItems(n, seed) {
  const items = []
  for (let i = 0; i < n; i++) items.push({ id: i, title: 'Item ' + i, subtitle: 'subtitle ' + ((i * 7 + seed) % 13), count: (i * 31 + seed * 17) % 100 })
  return items
}

// a legacy root commits synchronously, so each render is one full render and commit
const render = (el) => ReactFabric.render(el, 1, null, false)

const N = 1000
const MOUNTS = Number(globalThis.MOUNTS || 15)
const UPDATES = Number(globalThis.UPDATES || 150)

let t0 = now()
for (let m = 0; m < MOUNTS; m++) {
  render(h(App, { items: makeItems(N, m), selected: -1, theme: 'light' }))
  render(null)
}
const mountMs = now() - t0

render(h(App, { items: makeItems(N, 0), selected: 0, theme: 'light' }))
let items = makeItems(N, 0)
t0 = now()
for (let u = 0; u < UPDATES; u++) {
  const next = items.slice()
  for (let i = u % 10; i < N; i += 10) next[i] = { ...next[i], count: (next[i].count + 1) % 100 }
  if (u % 50 === 25) next.reverse()
  items = next
  render(h(App, { items, selected: u % N, theme: u % 50 === 49 ? 'dark' : 'light' }))
}
const updateMs = now() - t0

let nodes = 0
const count = (n) => {
  nodes++
  for (const c of n.children) count(c)
}
for (const c of roots.get(1)) count(c)
log('mount_ms=' + Math.round(mountMs) + ' update_ms=' + Math.round(updateMs) + ' nodes=' + nodes)
