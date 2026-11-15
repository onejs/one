import React from 'react'
import Reconciler from 'react-reconciler'

const log = typeof print === 'function' ? print : console.log
const now =
  typeof performance === 'object' && performance && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now()

// minimal mutation host config over plain objects, shaped like a native view tree
let priority = 2
const host = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,
  noTimeout: -1,
  createInstance(type, props) {
    return { type, style: props.style, label: props.label, children: [] }
  },
  createTextInstance(text) {
    return { type: '#text', text }
  },
  appendInitialChild(parent, child) {
    parent.children.push(child)
  },
  appendChild(parent, child) {
    const i = parent.children.indexOf(child)
    if (i >= 0) parent.children.splice(i, 1)
    parent.children.push(child)
  },
  appendChildToContainer(container, child) {
    host.appendChild(container, child)
  },
  insertBefore(parent, child, before) {
    const i = parent.children.indexOf(child)
    if (i >= 0) parent.children.splice(i, 1)
    parent.children.splice(parent.children.indexOf(before), 0, child)
  },
  insertInContainerBefore(container, child, before) {
    host.insertBefore(container, child, before)
  },
  removeChild(parent, child) {
    parent.children.splice(parent.children.indexOf(child), 1)
  },
  removeChildFromContainer(container, child) {
    host.removeChild(container, child)
  },
  commitUpdate(instance, type, oldProps, newProps) {
    instance.style = newProps.style
    instance.label = newProps.label
  },
  commitTextUpdate(textInstance, oldText, newText) {
    textInstance.text = newText
  },
  finalizeInitialChildren() {
    return false
  },
  shouldSetTextContent() {
    return false
  },
  getRootHostContext() {
    return null
  },
  getChildHostContext(parentContext) {
    return parentContext
  },
  getPublicInstance(instance) {
    return instance
  },
  prepareForCommit() {
    return null
  },
  resetAfterCommit() {},
  preparePortalMount() {},
  clearContainer(container) {
    container.children.length = 0
  },
  scheduleTimeout: (fn, ms) => setTimeout(fn, ms),
  cancelTimeout: (id) => clearTimeout(id),
  scheduleMicrotask: (fn) => Promise.resolve().then(fn),
  supportsMicrotasks: true,
  setCurrentUpdatePriority(p) {
    priority = p
  },
  getCurrentUpdatePriority() {
    return priority
  },
  resolveUpdatePriority() {
    return priority || 32
  },
  shouldAttemptEagerTransition() {
    return false
  },
  trackSchedulerEvent() {},
  resolveEventType() {
    return null
  },
  resolveEventTimeStamp() {
    return -1.1
  },
  requestPostPaintCallback() {},
  maySuspendCommit() {
    return false
  },
  maySuspendCommitOnUpdate() {
    return false
  },
  maySuspendCommitInSyncRender() {
    return false
  },
  preloadInstance() {
    return true
  },
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady() {
    return null
  },
  getSuspendedCommitReason() {
    return null
  },
  NotPendingTransition: null,
  HostTransitionContext: React.createContext(null),
  resetFormInstance() {},
  bindToConsole() {},
  detachDeletedInstance() {},
  hideInstance() {},
  hideTextInstance() {},
  unhideInstance() {},
  unhideTextInstance() {},
  rendererPackageName: 'bench',
  rendererVersion: '0.0.0',
}

const R = Reconciler(host)
const h = React.createElement
const { memo, useState, useMemo, useContext, createContext } = React

const Theme = createContext({ color: 'black', size: 14 })

function Text(props) {
  const theme = useContext(Theme)
  return h('text', { style: { color: theme.color, fontSize: theme.size, fontWeight: props.bold ? 'bold' : 'normal' } }, props.children)
}

const Badge = memo(function Badge({ count }) {
  return h('view', { style: { padding: 4, borderRadius: 8, backgroundColor: count > 50 ? 'red' : 'gray' } }, h(Text, null, String(count)))
})

function Row({ item, selected }) {
  const [open] = useState(false)
  const label = useMemo(() => item.title + ' #' + item.id, [item.title, item.id])
  return h(
    'view',
    { label, style: { flexDirection: 'row', padding: 8, backgroundColor: selected ? 'blue' : 'white', opacity: open ? 1 : 0.9 } },
    h('view', { style: { width: 40, height: 40, borderRadius: 20 } }),
    h('view', { style: { flex: 1 } }, h(Text, { bold: selected }, label), h(Text, null, item.subtitle)),
    h(Badge, { count: item.count })
  )
}

function App({ items, selected, theme }) {
  return h(Theme.Provider, { value: theme }, h('view', { style: { flex: 1 } }, items.map((item) => h(Row, { key: item.id, item, selected: item.id === selected }))))
}

function makeItems(n, seed) {
  const items = []
  for (let i = 0; i < n; i++) {
    items.push({ id: i, title: 'Item ' + i, subtitle: 'subtitle ' + ((i * 7 + seed) % 13), count: (i * 31 + seed * 17) % 100 })
  }
  return items
}

const container = { children: [] }
const root = R.createContainer(container, 1, null, false, null, '', (e) => { throw e }, (e) => { throw e }, (e) => { throw e }, null)

function render(el) {
  R.updateContainerSync(el, root, null, null)
  R.flushSyncWork ? R.flushSyncWork() : R.flushSyncFromReconciler()
}

const N = 1000
const MOUNTS = Number(globalThis.MOUNTS || 30)
const UPDATES = Number(globalThis.UPDATES || 300)

// mount and unmount a 1000 row list
let t0 = now()
for (let m = 0; m < MOUNTS; m++) {
  render(h(App, { items: makeItems(N, m), selected: -1, theme: { color: 'black', size: 14 } }))
  render(null)
}
const mountMs = now() - t0

// update: new data every frame, a selection change and periodic reorder/theme change
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
  if (n.children) for (const c of n.children) count(c)
}
count(container)
log('mount_ms=' + Math.round(mountMs) + ' update_ms=' + Math.round(updateMs) + ' nodes=' + nodes)
