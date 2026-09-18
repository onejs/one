export interface NativeBridgeInterface {
  createView(type: string, id: number): void;
  setProp(id: number, key: string, value: any): void;
  appendChild(parentId: number, childId: number): void;
  removeChild(parentId: number, childId: number): void;
  insertBefore(parentId: number, childId: number, beforeId: number): void;
  calculateLayout(rootId: number, width: number, height: number): void;
}

export type EventHandler = (payload: any) => void;
export type ShouldChangeTextHandler = (location: number, length: number, replacement: string) => boolean;

class NativeBridgeManager {
  private eventHandlers = new Map<string, EventHandler>();
  private textValidationHandlers = new Map<number, ShouldChangeTextHandler>();
  private nextId = 100;

  generateId(): number {
    return this.nextId++;
  }

  get bridge(): NativeBridgeInterface {
    const b = (globalThis as any).__nativeBridge;
    if (!b) {
      // Fallback/mock for debugging
      return {
        createView: (type, id) => console.log(`[BridgeMock] createView ${type} #${id}`),
        setProp: (id, key, value) => console.log(`[BridgeMock] setProp #${id} ${key}=`, value),
        appendChild: (p, c) => console.log(`[BridgeMock] appendChild #${c} -> #${p}`),
        removeChild: (p, c) => console.log(`[BridgeMock] removeChild #${c} from #${p}`),
        insertBefore: (p, c, b) => console.log(`[BridgeMock] insertBefore #${c} -> #${p} before #${b}`),
        calculateLayout: (r, w, h) => console.log(`[BridgeMock] calculateLayout #${r} (${w}x${h})`),
      };
    }
    return b;
  }

  registerEventHandler(nodeId: number, eventName: string, handler: EventHandler) {
    this.eventHandlers.set(`${nodeId}:${eventName}`, handler);
  }

  unregisterEventHandler(nodeId: number, eventName: string) {
    this.eventHandlers.delete(`${nodeId}:${eventName}`);
  }

  registerTextValidation(nodeId: number, handler: ShouldChangeTextHandler) {
    this.textValidationHandlers.set(nodeId, handler);
  }

  unregisterTextValidation(nodeId: number) {
    this.textValidationHandlers.delete(nodeId);
  }

  // Called directly from native Main Thread via JSI / JSContext:
  dispatchNativeEvent(nodeId: number, eventName: string, payload: any) {
    const handler = this.eventHandlers.get(`${nodeId}:${eventName}`);
    if (handler) {
      handler(payload);
    }
  }

  // Called synchronously by UIKit UITextFieldDelegate.textField:shouldChangeCharactersInRange:replacementString:
  shouldChangeText(nodeId: number, location: number, length: number, replacement: string): boolean {
    const validator = this.textValidationHandlers.get(nodeId);
    if (validator) {
      return validator(location, length, replacement);
    }
    return true;
  }
}

export const Bridge = new NativeBridgeManager();

// Expose dispatch functions globally so native Swift/ObjC code can call them synchronously:
(globalThis as any).__dispatchNativeEvent = (nodeId: number, eventName: string, payload: any) => {
  Bridge.dispatchNativeEvent(nodeId, eventName, payload);
};

(globalThis as any).__shouldChangeText = (nodeId: number, location: number, length: number, replacement: string): boolean => {
  return Bridge.shouldChangeText(nodeId, location, length, replacement);
};
