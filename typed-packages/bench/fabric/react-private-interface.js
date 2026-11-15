// stands in for react-native/react-private-interface: what ReactFabric-prod.js uses, over plain
// objects shaped like Fabric's shadow nodes, with a prop payload diff like ReactNativeAttributePayload
const style = { flex: true, flexDirection: true, padding: true, width: true, height: true, borderRadius: true, backgroundColor: true, opacity: true, color: true, fontSize: true, fontWeight: true }
const viewConfig = (name) => ({ uiViewClassName: name, validAttributes: { style, label: true, text: true, testID: true }, bubblingEventTypes: {}, directEventTypes: {} })
const configs = { RCTView: viewConfig('RCTView'), RCTText: viewConfig('RCTText') }

function addProps(payload, props, valid) {
  for (const key in props) {
    if (key === 'children') continue
    const v = props[key]
    const attr = valid[key]
    if (!attr) continue
    if (typeof attr === 'object' && v) addProps(payload, v, attr)
    else if (typeof v !== 'function') payload[key] = v
  }
  return payload
}

function diffProps(payload, prev, next, valid) {
  for (const key in next) {
    if (key === 'children') continue
    const attr = valid[key]
    if (!attr || next[key] === prev[key]) continue
    if (typeof attr === 'object') payload = diffProps(payload, prev[key] || {}, next[key] || {}, attr)
    else (payload ??= {})[key] = next[key]
  }
  for (const key in prev) {
    if (key === 'children' || key in next || !valid[key]) continue
    if (typeof valid[key] === 'object') payload = diffProps(payload, prev[key] || {}, {}, valid[key])
    else (payload ??= {})[key] = null
  }
  return payload
}

// fabricUIManager is a native host object in an app, which no compiler sees into, so it is built at run time here
const roots = new Map()
const fabricUIManager = new Function('roots', `return {
  createNode: (tag, viewName, rootTag, props, handle) => ({ tag, viewName, props, children: [] }),
  cloneNodeWithNewChildren: (node) => ({ ...node, children: [] }),
  cloneNodeWithNewProps: (node, props) => ({ ...node, props: { ...node.props, ...props } }),
  cloneNodeWithNewChildrenAndProps: (node, props) => ({ ...node, props: { ...node.props, ...props }, children: [] }),
  appendChild: (parent, child) => void parent.children.push(child),
  createChildSet: () => [],
  appendChildToSet: (set, child) => void set.push(child),
  completeRoot: (rootTag, set) => void roots.set(rootTag, set),
  registerEventHandler() {},
  setIsJSResponder() {},
  dispatchCommand() {},
  sendAccessibilityEvent() {},
  unstable_DiscreteEventPriority: 2,
  unstable_ContinuousEventPriority: 8,
  unstable_IdleEventPriority: 268435456,
  unstable_getCurrentEventPriority: () => 32,
}`)(roots)

module.exports = {
  roots,
  fabricUIManager,
  ReactNativeViewConfigRegistry: { get: (name) => configs[name], customBubblingEventTypes: {}, customDirectEventTypes: {} },
  ReactNativeFeatureFlags: null,
  ReactFiberErrorDialog: { showErrorDialog: () => true },
  RawEventEmitter: { emit() {} },
  createAttributePayload: (props, valid) => addProps({}, props, valid),
  diffAttributePayloads: (prev, next, valid) => diffProps(null, prev, next, valid),
  createPublicInstance: (tag, viewConfig) => ({ tag, viewConfig }),
  createPublicTextInstance: (handle) => ({ handle }),
  createPublicRootInstance: (rootTag) => ({ rootTag }),
  getNativeTagFromPublicInstance: (i) => i.tag,
  getNodeFromPublicInstance: (i) => i,
  dispatchNativeEvent() {},
}
