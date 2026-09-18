import ReactReconciler from 'react-reconciler';
import { Bridge } from './bridge';

export interface NativeInstance {
  id: number;
  type: string;
  props: Record<string, any>;
  children: NativeInstance[];
  parent?: NativeInstance | NativeContainer;
}

export interface NativeContainer {
  id: number;
  type: 'root';
  props: Record<string, any>;
  children: NativeInstance[];
}

function updateInstanceProps(instance: NativeInstance, oldProps: Record<string, any>, newProps: Record<string, any>) {
  const id = instance.id;

  // Sync event handlers:
  if (oldProps.onPress !== newProps.onPress) {
    if (newProps.onPress) {
      Bridge.registerEventHandler(id, 'press', newProps.onPress);
    } else {
      Bridge.unregisterEventHandler(id, 'press');
    }
  }

  if (oldProps.onChangeText !== newProps.onChangeText) {
    if (newProps.onChangeText) {
      Bridge.registerEventHandler(id, 'changeText', newProps.onChangeText);
    } else {
      Bridge.unregisterEventHandler(id, 'changeText');
    }
  }

  if (oldProps.filterRegex !== newProps.filterRegex) {
    if (newProps.filterRegex) {
      const regex = new RegExp(newProps.filterRegex);
      Bridge.registerTextValidation(id, (_loc, _len, replacement) => {
        // Empty replacement (backspace/deletion) is always allowed:
        if (replacement === '') return true;
        return regex.test(replacement);
      });
    } else {
      Bridge.unregisterTextValidation(id);
    }
  }

  // Pass all styling and visual properties to native host:
  for (const key of Object.keys(newProps)) {
    if (key === 'children' || key === 'onPress' || key === 'onChangeText') continue;
    if (oldProps[key] !== newProps[key]) {
      Bridge.bridge.setProp(id, key, newProps[key]);
    }
  }

  instance.props = newProps;
}

let currentUpdatePriority = 0;

export const hostConfig: any = {
  supportsMutation: true,
  supportsPersistence: false,
  isPrimaryRenderer: true,
  supportsHydration: false,

  createInstance(type: string, props: any) {
    const id = Bridge.generateId();
    Bridge.bridge.createView(type, id);

    const instance: NativeInstance = {
      id,
      type,
      props: {},
      children: [],
    };

    updateInstanceProps(instance, {}, props);
    return instance;
  },

  createTextInstance(text: string) {
    const id = Bridge.generateId();
    Bridge.bridge.createView('text', id);
    Bridge.bridge.setProp(id, 'text', text);

    return {
      id,
      type: 'text',
      props: { text },
      children: [],
    };
  },

  appendInitialChild(parent: NativeInstance, child: NativeInstance) {
    parent.children.push(child);
    child.parent = parent;
    Bridge.bridge.appendChild(parent.id, child.id);
  },

  appendChild(parent: NativeInstance, child: NativeInstance) {
    parent.children.push(child);
    child.parent = parent;
    Bridge.bridge.appendChild(parent.id, child.id);
  },

  appendChildToContainer(container: NativeContainer, child: NativeInstance) {
    container.children.push(child);
    child.parent = container;
    Bridge.bridge.appendChild(container.id, child.id);
  },

  insertBefore(parent: NativeInstance, child: NativeInstance, beforeChild: NativeInstance) {
    const idx = parent.children.indexOf(beforeChild);
    if (idx !== -1) {
      parent.children.splice(idx, 0, child);
    } else {
      parent.children.push(child);
    }
    child.parent = parent;
    Bridge.bridge.insertBefore(parent.id, child.id, beforeChild.id);
  },

  insertInContainerBefore(container: NativeContainer, child: NativeInstance, beforeChild: NativeInstance) {
    const idx = container.children.indexOf(beforeChild);
    if (idx !== -1) {
      container.children.splice(idx, 0, child);
    } else {
      container.children.push(child);
    }
    child.parent = container;
    Bridge.bridge.insertBefore(container.id, child.id, beforeChild.id);
  },

  removeChild(parent: NativeInstance, child: NativeInstance) {
    const idx = parent.children.indexOf(child);
    if (idx !== -1) {
      parent.children.splice(idx, 1);
    }
    Bridge.unregisterEventHandler(child.id, 'press');
    Bridge.unregisterEventHandler(child.id, 'changeText');
    Bridge.unregisterTextValidation(child.id);
    Bridge.bridge.removeChild(parent.id, child.id);
  },

  removeChildFromContainer(container: NativeContainer, child: NativeInstance) {
    const idx = container.children.indexOf(child);
    if (idx !== -1) {
      container.children.splice(idx, 1);
    }
    Bridge.unregisterEventHandler(child.id, 'press');
    Bridge.unregisterEventHandler(child.id, 'changeText');
    Bridge.unregisterTextValidation(child.id);
    Bridge.bridge.removeChild(container.id, child.id);
  },

  clearContainer(container: NativeContainer) {
    container.children = [];
  },

  finalizeInitialChildren() {
    return false;
  },

  prepareUpdate() {
    return true;
  },

  commitUpdate(instance: NativeInstance, _updatePayload: any, _type: string, oldProps: any, newProps: any) {
    updateInstanceProps(instance, oldProps, newProps);
  },

  commitTextUpdate(textInstance: NativeInstance, _oldText: string, newText: string) {
    textInstance.props.text = newText;
    Bridge.bridge.setProp(textInstance.id, 'text', newText);
  },

  getRootHostContext() {
    return {};
  },

  getChildHostContext() {
    return {};
  },

  getPublicInstance(instance: any) {
    return instance;
  },

  prepareForCommit() {
    return null;
  },

  resetAfterCommit(containerInfo: NativeContainer) {
    // Synchronously execute main-thread layout calculation pass:
    Bridge.bridge.calculateLayout(containerInfo.id, -1, -1);
  },

  shouldSetTextContent() {
    return false;
  },

  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,

  setCurrentUpdatePriority(newPriority: number) {
    currentUpdatePriority = newPriority;
  },
  getCurrentUpdatePriority() {
    return currentUpdatePriority;
  },
  resolveUpdatePriority() {
    if (currentUpdatePriority !== 0) {
      return currentUpdatePriority;
    }
    return 32; // DefaultEventPriority
  },
  shouldAttemptEagerTransition() {
    return false;
  },
  trackSchedulerEvent() {},
  resolveEventType() { return null; },
  resolveEventTimeStamp() { return -1.1; },

  maySuspendCommit() { return false; },
  preloadInstance() { return true; },
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady() { return null; },
  NotPendingTransition: null,
  resetFormInstance() {},

  supportsMicrotasks: true,
  scheduleMicrotask: queueMicrotask,

  getInstanceFromNode() { return null; },
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  prepareScopeUpdate() {},
  getInstanceFromScope() { return null; },
  detachDeletedInstance() {},
};

export const reconciler = ReactReconciler(hostConfig);
