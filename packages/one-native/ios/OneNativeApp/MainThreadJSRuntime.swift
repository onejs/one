import Foundation
import JavaScriptCore
import QuartzCore

class MainThreadJSRuntime {
    let context: JSContext
    var viewManager: NativeViewManager!
    
    // Timer tracking
    private var timerId: Int = 1
    private var activeTimers: [Int: Timer] = [:]
    
    // DisplayLink for requestAnimationFrame
    private var displayLink: CADisplayLink?
    private var rafId: Int = 1
    private var rafCallbacks: [(id: Int, callback: JSValue)] = []
    
    init() {
        assert(Thread.isMainThread, "MainThreadJSRuntime MUST be initialized on CFRunLoopMain!")
        
        guard let ctx = JSContext() else {
            fatalError("Failed to initialize JSContext")
        }
        self.context = ctx
        
        self.viewManager = NativeViewManager(runtime: self)
        
        setupLogging()
        setupTimers()
        setupDisplayLink()
        setupNativeBridge()
    }
    
    deinit {
        displayLink?.invalidate()
        for (_, t) in activeTimers {
            t.invalidate()
        }
    }
    
    private func setupLogging() {
        context.exceptionHandler = { ctx, exception in
            if let exc = exception {
                print("[OneNative:JSException] ❌", exc.toString() ?? "unknown error")
                if let stack = exc.objectForKeyedSubscript("stack")?.toString() {
                    print("[OneNative:JSStack]", stack)
                }
            }
        }
        
        let log: @convention(block) () -> Void = {
            let args = JSContext.currentArguments() ?? []
            let msg = args.map { ($0 as? JSValue)?.toString() ?? "" }.joined(separator: " ")
            print("[OneNative:Log]", msg)
        }
        
        let warn: @convention(block) () -> Void = {
            let args = JSContext.currentArguments() ?? []
            let msg = args.map { ($0 as? JSValue)?.toString() ?? "" }.joined(separator: " ")
            print("[OneNative:Warn] ⚠️", msg)
        }
        
        let error: @convention(block) () -> Void = {
            let args = JSContext.currentArguments() ?? []
            let msg = args.map { ($0 as? JSValue)?.toString() ?? "" }.joined(separator: " ")
            print("[OneNative:Error] 🛑", msg)
        }
        
        let console = JSValue(newObjectIn: context)
        console?.setValue(unsafeBitCast(log, to: AnyObject.self), forProperty: "log")
        console?.setValue(unsafeBitCast(warn, to: AnyObject.self), forProperty: "warn")
        console?.setValue(unsafeBitCast(error, to: AnyObject.self), forProperty: "error")
        context.globalObject.setValue(console, forProperty: "console")
        
        // Polyfill window and globalThis
        context.globalObject.setValue(context.globalObject, forProperty: "globalThis")
        context.globalObject.setValue(context.globalObject, forProperty: "window")
    }
    
    private func setupTimers() {
        // setTimeout
        let setTimeoutBlock: @convention(block) (JSValue, Double) -> Int = { [weak self] callback, delayMs in
            guard let self = self else { return 0 }
            let id = self.timerId
            self.timerId += 1
            
            let seconds = max(0.001, delayMs / 1000.0)
            let timer = Timer.scheduledTimer(withTimeInterval: seconds, repeats: false) { [weak self] _ in
                assert(Thread.isMainThread, "Timer callback must execute on Main Thread")
                callback.call(withArguments: [])
                self?.activeTimers.removeValue(forKey: id)
            }
            RunLoop.main.add(timer, forMode: .common)
            self.activeTimers[id] = timer
            return id
        }
        
        let clearTimeoutBlock: @convention(block) (Int) -> Void = { [weak self] id in
            if let timer = self?.activeTimers.removeValue(forKey: id) {
                timer.invalidate()
            }
        }
        
        context.globalObject.setValue(unsafeBitCast(setTimeoutBlock, to: AnyObject.self), forProperty: "setTimeout")
        context.globalObject.setValue(unsafeBitCast(clearTimeoutBlock, to: AnyObject.self), forProperty: "clearTimeout")
        
        // queueMicrotask
        let queueMicrotaskBlock: @convention(block) (JSValue) -> Void = { callback in
            DispatchQueue.main.async {
                callback.call(withArguments: [])
            }
        }
        context.globalObject.setValue(unsafeBitCast(queueMicrotaskBlock, to: AnyObject.self), forProperty: "queueMicrotask")
    }
    
    private func setupDisplayLink() {
        let dl = CADisplayLink(target: self, selector: #selector(onDisplayLink(link:)))
        dl.add(to: .main, forMode: .common)
        self.displayLink = dl
        
        let requestAnimationFrameBlock: @convention(block) (JSValue) -> Int = { [weak self] callback in
            guard let self = self else { return 0 }
            let id = self.rafId
            self.rafId += 1
            self.rafCallbacks.append((id: id, callback: callback))
            return id
        }
        
        let cancelAnimationFrameBlock: @convention(block) (Int) -> Void = { [weak self] id in
            self?.rafCallbacks.removeAll { $0.id == id }
        }
        
        context.globalObject.setValue(unsafeBitCast(requestAnimationFrameBlock, to: AnyObject.self), forProperty: "requestAnimationFrame")
        context.globalObject.setValue(unsafeBitCast(cancelAnimationFrameBlock, to: AnyObject.self), forProperty: "cancelAnimationFrame")
    }
    
    @objc private func onDisplayLink(link: CADisplayLink) {
        assert(Thread.isMainThread, "CADisplayLink must fire on Main Thread")
        guard !rafCallbacks.isEmpty else { return }
        let currentCallbacks = rafCallbacks
        rafCallbacks.removeAll()
        
        let timestamp = link.timestamp * 1000.0
        for item in currentCallbacks {
            item.callback.call(withArguments: [timestamp])
        }
    }
    
    private func setupNativeBridge() {
        let bridge = JSValue(newObjectIn: context)
        
        let createViewBlock: @convention(block) (String, Int) -> Void = { [weak self] type, id in
            self?.viewManager.createView(type: type, id: id)
        }
        
        let setPropBlock: @convention(block) (Int, String, JSValue) -> Void = { [weak self] id, key, jsVal in
            if let obj = jsVal.toObject() {
                self?.viewManager.setProp(id: id, key: key, value: obj)
            }
        }
        
        let appendChildBlock: @convention(block) (Int, Int) -> Void = { [weak self] pId, cId in
            self?.viewManager.appendChild(parentId: pId, childId: cId)
        }
        
        let removeChildBlock: @convention(block) (Int, Int) -> Void = { [weak self] pId, cId in
            self?.viewManager.removeChild(parentId: pId, childId: cId)
        }
        
        let insertBeforeBlock: @convention(block) (Int, Int, Int) -> Void = { [weak self] pId, cId, bId in
            self?.viewManager.insertBefore(parentId: pId, childId: cId, beforeId: bId)
        }
        
        let calculateLayoutBlock: @convention(block) (Int, Double, Double) -> Void = { [weak self] rId, w, h in
            self?.viewManager.calculateLayout(rootId: rId, width: CGFloat(w), height: CGFloat(h))
        }
        
        bridge?.setValue(unsafeBitCast(createViewBlock, to: AnyObject.self), forProperty: "createView")
        bridge?.setValue(unsafeBitCast(setPropBlock, to: AnyObject.self), forProperty: "setProp")
        bridge?.setValue(unsafeBitCast(appendChildBlock, to: AnyObject.self), forProperty: "appendChild")
        bridge?.setValue(unsafeBitCast(removeChildBlock, to: AnyObject.self), forProperty: "removeChild")
        bridge?.setValue(unsafeBitCast(insertBeforeBlock, to: AnyObject.self), forProperty: "insertBefore")
        bridge?.setValue(unsafeBitCast(calculateLayoutBlock, to: AnyObject.self), forProperty: "calculateLayout")
        
        context.globalObject.setValue(bridge, forProperty: "__nativeBridge")
    }
    
    func evaluateBundle(jsCode: String) {
        assert(Thread.isMainThread, "Bundle evaluation must happen on Main Thread")
        print("[OneNative:Host] Evaluating JS Bundle on CFRunLoopMain...")
        let startTime = CFAbsoluteTimeGetCurrent()
        context.evaluateScript(jsCode)
        let duration = (CFAbsoluteTimeGetCurrent() - startTime) * 1000.0
        print(String(format: "[OneNative:Host] JS Bundle evaluation completed in %.2f ms", duration))
    }
    
    // Dispatches a native UI event synchronously to JavaScript on the Main Thread:
    func dispatchNativeEvent(nodeId: Int, eventName: String, payload: Any?) {
        assert(Thread.isMainThread, "dispatchNativeEvent must run on Main Thread")
        guard let fn = context.globalObject.objectForKeyedSubscript("__dispatchNativeEvent"), !fn.isUndefined else {
            return
        }
        fn.call(withArguments: [nodeId, eventName, payload ?? NSNull()])
    }
    
    // Synchronously queries JavaScript from UIKit delegate methods (e.g. shouldChangeCharactersInRange)
    func shouldChangeText(nodeId: Int, location: Int, length: Int, replacement: String) -> Bool {
        assert(Thread.isMainThread, "shouldChangeText delegate query must run on Main Thread")
        guard let fn = context.globalObject.objectForKeyedSubscript("__shouldChangeText"), !fn.isUndefined else {
            return true
        }
        let result = fn.call(withArguments: [nodeId, location, length, replacement])
        let allowed = result?.toBool() ?? true
        print("[OneNative:DelegateSync] textField:shouldChangeCharactersInRange queried JS -> returned \(allowed)")
        return allowed
    }
}
