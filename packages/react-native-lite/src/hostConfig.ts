import ReactReconciler from 'react-reconciler'
import { Bridge } from './bridge'

export interface NativeInstance {
  id: number
  type: string
  props: Record<string, any>
  children: NativeInstance[]
  parent?: NativeInstance | NativeContainer
  isMounted: boolean
}

export interface NativeContainer {
  id: number
  type: 'root'
  props: Record<string, any>
  children: NativeInstance[]
}

function updateInstanceProps(
  instance: NativeInstance,
  oldProps: Record<string, any>,
  newProps: Record<string, any>
) {
  const id = instance.id

  // Sync event handlers:
  if (oldProps.onPress !== newProps.onPress) {
    if (newProps.onPress) {
      Bridge.registerEventHandler(id, 'press', newProps.onPress)
    } else {
      Bridge.unregisterEventHandler(id, 'press')
    }
  }

  if (oldProps.onChangeText !== newProps.onChangeText) {
    if (newProps.onChangeText) {
      Bridge.registerEventHandler(id, 'changeText', newProps.onChangeText)
    } else {
      Bridge.unregisterEventHandler(id, 'changeText')
    }
  }

  if (oldProps.filterRegex !== newProps.filterRegex) {
    if (newProps.filterRegex) {
      const regex = new RegExp(newProps.filterRegex)
      Bridge.registerTextValidation(id, (_loc, _len, replacement) => {
        // Empty replacement (backspace/deletion) is always allowed:
        if (replacement === '') return true
        return regex.test(replacement)
      })
    } else {
      Bridge.unregisterTextValidation(id)
    }
  }

  // Pass all styling and visual properties to native host:
  // 1. Updated or newly added props:
  for (const key of Object.keys(newProps)) {
    if (
      key === 'children' ||
      key === 'onPress' ||
      key === 'onChangeText' ||
      key === 'filterRegex'
    ) {
      continue
    }
    if (oldProps[key] !== newProps[key]) {
      Bridge.bridge.setProp(id, key, newProps[key])
    }
  }

  // 2. Reset removed props:
  for (const key of Object.keys(oldProps)) {
    if (
      key === 'children' ||
      key === 'onPress' ||
      key === 'onChangeText' ||
      key === 'filterRegex'
    ) {
      continue
    }
    if (!(key in newProps)) {
      Bridge.bridge.setProp(id, key, undefined)
    }
  }

  instance.props = newProps
}

function mountSubtree(instance: NativeInstance) {
  if (instance.isMounted) return

  Bridge.bridge.createView(instance.type, instance.id)
  updateInstanceProps(instance, {}, instance.props)

  for (const child of instance.children) {
    mountSubtree(child)
    Bridge.bridge.appendChild(instance.id, child.id)
  }

  instance.isMounted = true
}

function teardownSubtree(instance: NativeInstance) {
  for (const child of instance.children) {
    teardownSubtree(child)
  }

  Bridge.unregisterAllHandlers(instance.id)

  if (Bridge.bridge.destroyView) {
    Bridge.bridge.destroyView(instance.id)
  }

  instance.isMounted = false
  instance.parent = undefined
  instance.children = []
}

let currentUpdatePriority = 0

export const hostConfig: any = {
  supportsMutation: true,
  supportsPersistence: false,
  isPrimaryRenderer: true,
  supportsHydration: false,

  // Render phase: allocate in-memory instance only, no bridge mutations or event registrations
  createInstance(type: string, props: any) {
    const instance: NativeInstance = {
      id: Bridge.generateId(),
      type,
      props: { ...props },
      children: [],
      isMounted: false,
    }
    return instance
  },

  createTextInstance(text: string) {
    const instance: NativeInstance = {
      id: Bridge.generateId(),
      type: 'text',
      props: { text },
      children: [],
      isMounted: false,
    }
    return instance
  },

  appendInitialChild(parent: NativeInstance, child: NativeInstance) {
    parent.children.push(child)
    child.parent = parent
  },

  finalizeInitialChildren() {
    return false
  },

  shouldSetTextContent() {
    return false
  },

  getRootHostContext() {
    return {}
  },

  getChildHostContext() {
    return {}
  },

  getPublicInstance(instance: any) {
    return instance
  },

  prepareForCommit() {
    return null
  },

  resetAfterCommit(containerInfo: NativeContainer) {
    // Synchronously execute main-thread layout calculation pass:
    Bridge.bridge.calculateLayout(containerInfo.id, -1, -1)
  },

  // Commit phase: mount / mutate native views and handlers
  appendChildToContainer(container: NativeContainer, child: NativeInstance) {
    container.children.push(child)
    child.parent = container
    mountSubtree(child)
    Bridge.bridge.appendChild(container.id, child.id)
  },

  insertInContainerBefore(
    container: NativeContainer,
    child: NativeInstance,
    beforeChild: NativeInstance
  ) {
    const idx = container.children.indexOf(beforeChild)
    if (idx !== -1) {
      container.children.splice(idx, 0, child)
    } else {
      container.children.push(child)
    }
    child.parent = container
    mountSubtree(child)
    Bridge.bridge.insertBefore(container.id, child.id, beforeChild.id)
  },

  appendChild(parent: NativeInstance, child: NativeInstance) {
    parent.children.push(child)
    child.parent = parent
    if (parent.isMounted) {
      mountSubtree(child)
      Bridge.bridge.appendChild(parent.id, child.id)
    }
  },

  insertBefore(
    parent: NativeInstance,
    child: NativeInstance,
    beforeChild: NativeInstance
  ) {
    const idx = parent.children.indexOf(beforeChild)
    if (idx !== -1) {
      parent.children.splice(idx, 0, child)
    } else {
      parent.children.push(child)
    }
    child.parent = parent
    if (parent.isMounted) {
      mountSubtree(child)
      Bridge.bridge.insertBefore(parent.id, child.id, beforeChild.id)
    }
  },

  removeChild(parent: NativeInstance, child: NativeInstance) {
    const idx = parent.children.indexOf(child)
    if (idx !== -1) {
      parent.children.splice(idx, 1)
    }
    if (parent.isMounted && child.isMounted) {
      Bridge.bridge.removeChild(parent.id, child.id)
    }
    teardownSubtree(child)
  },

  removeChildFromContainer(container: NativeContainer, child: NativeInstance) {
    const idx = container.children.indexOf(child)
    if (idx !== -1) {
      container.children.splice(idx, 1)
    }
    if (child.isMounted) {
      Bridge.bridge.removeChild(container.id, child.id)
    }
    teardownSubtree(child)
  },

  clearContainer(container: NativeContainer) {
    for (const child of container.children) {
      if (child.isMounted) {
        Bridge.bridge.removeChild(container.id, child.id)
      }
      teardownSubtree(child)
    }
    container.children = []
  },

  // Correct React 19 update contract: (instance, type, oldProps, newProps, internalHandle)
  commitUpdate(
    instance: NativeInstance,
    _type: string,
    oldProps: Record<string, any>,
    newProps: Record<string, any>
  ) {
    updateInstanceProps(instance, oldProps, newProps)
  },

  commitTextUpdate(textInstance: NativeInstance, _oldText: string, newText: string) {
    textInstance.props.text = newText
    if (textInstance.isMounted) {
      Bridge.bridge.setProp(textInstance.id, 'text', newText)
    }
  },

  detachDeletedInstance(instance: NativeInstance) {
    teardownSubtree(instance)
  },

  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,

  setCurrentUpdatePriority(newPriority: number) {
    currentUpdatePriority = newPriority
  },
  getCurrentUpdatePriority() {
    return currentUpdatePriority
  },
  resolveUpdatePriority() {
    if (currentUpdatePriority !== 0) {
      return currentUpdatePriority
    }
    return 32 // DefaultEventPriority
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

  maySuspendCommit() {
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
  NotPendingTransition: null,
  resetFormInstance() {},

  supportsMicrotasks: true,
  scheduleMicrotask: queueMicrotask,

  getInstanceFromNode() {
    return null
  },
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  prepareScopeUpdate() {},
  getInstanceFromScope() {
    return null
  },
}

export const reconciler = ReactReconciler(hostConfig)
