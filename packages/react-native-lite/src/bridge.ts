export interface NativeBridgeInterface {
  createView(type: string, id: number): void
  setProp(id: number, key: string, value: any): void
  appendChild(parentId: number, childId: number): void
  removeChild(parentId: number, childId: number): void
  insertBefore(parentId: number, childId: number, beforeId: number): void
  calculateLayout(rootId: number, width: number, height: number): void
  destroyView(id: number): void
}

export type EventHandler = (payload: any) => void
export type ShouldChangeTextHandler = (
  location: number,
  length: number,
  replacement: string
) => boolean

export class NativeBridgeManager {
  private customBridge: NativeBridgeInterface | null = null
  private eventHandlers = new Map<number, Map<string, EventHandler>>()
  private textValidationHandlers = new Map<number, ShouldChangeTextHandler>()
  private nextId = 100

  generateId(): number {
    return this.nextId++
  }

  setBridge(bridge: NativeBridgeInterface | null) {
    this.customBridge = bridge
  }

  get bridge(): NativeBridgeInterface {
    if (this.customBridge) {
      return this.customBridge
    }
    const globalBridge = (globalThis as any).__nativeBridge as
      | NativeBridgeInterface
      | undefined
    if (globalBridge) {
      return globalBridge
    }
    throw new Error(
      'React Native Lite: Native bridge is not installed. Ensure __nativeBridge is provided by the host environment or injected via Bridge.setBridge(...).'
    )
  }

  registerEventHandler(nodeId: number, eventName: string, handler: EventHandler) {
    let handlers = this.eventHandlers.get(nodeId)
    if (!handlers) {
      handlers = new Map()
      this.eventHandlers.set(nodeId, handlers)
    }
    handlers.set(eventName, handler)
  }

  unregisterEventHandler(nodeId: number, eventName: string) {
    const handlers = this.eventHandlers.get(nodeId)
    if (handlers) {
      handlers.delete(eventName)
      if (handlers.size === 0) {
        this.eventHandlers.delete(nodeId)
      }
    }
  }

  unregisterAllHandlers(nodeId: number) {
    this.eventHandlers.delete(nodeId)
    this.textValidationHandlers.delete(nodeId)
  }

  registerTextValidation(nodeId: number, handler: ShouldChangeTextHandler) {
    this.textValidationHandlers.set(nodeId, handler)
  }

  unregisterTextValidation(nodeId: number) {
    this.textValidationHandlers.delete(nodeId)
  }

  hasRegisteredHandlers(nodeId: number): boolean {
    return this.eventHandlers.has(nodeId) || this.textValidationHandlers.has(nodeId)
  }

  getRegisteredHandlerCount(): number {
    let count = 0
    for (const handlers of this.eventHandlers.values()) {
      count += handlers.size
    }
    count += this.textValidationHandlers.size
    return count
  }

  // Called directly from native Main Thread via JSI / JSContext:
  dispatchNativeEvent(nodeId: number, eventName: string, payload: any) {
    const handler = this.eventHandlers.get(nodeId)?.get(eventName)
    if (handler) {
      handler(payload)
    }
  }

  // Called synchronously by UIKit UITextFieldDelegate.textField:shouldChangeCharactersInRange:replacementString:
  shouldChangeText(
    nodeId: number,
    location: number,
    length: number,
    replacement: string
  ): boolean {
    const validator = this.textValidationHandlers.get(nodeId)
    if (validator) {
      return validator(location, length, replacement)
    }
    return true
  }

  reset() {
    this.eventHandlers.clear()
    this.textValidationHandlers.clear()
    this.customBridge = null
    this.nextId = 100
  }
}

export const Bridge = new NativeBridgeManager()

export function setNativeBridge(bridge: NativeBridgeInterface | null) {
  Bridge.setBridge(bridge)
}

export function getNativeBridge(): NativeBridgeInterface {
  return Bridge.bridge
}

// Expose dispatch functions globally so native Swift/ObjC code can call them synchronously:
;(globalThis as any).__dispatchNativeEvent = (
  nodeId: number,
  eventName: string,
  payload: any
) => {
  Bridge.dispatchNativeEvent(nodeId, eventName, payload)
}

;(globalThis as any).__shouldChangeText = (
  nodeId: number,
  location: number,
  length: number,
  replacement: string
): boolean => {
  return Bridge.shouldChangeText(nodeId, location, length, replacement)
}
