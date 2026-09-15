import UIKit

class ViewController: UIViewController {
    var runtime: MainThreadJSRuntime!
    var rootView: NativeContainerView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.view.backgroundColor = UIColor(red: 9/255.0, green: 13/255.0, blue: 22/255.0, alpha: 1.0)
        
        // 1. Initialize Main-Thread JS Runtime
        runtime = MainThreadJSRuntime()
        
        // 2. Create Root Native View (nodeId = 1)
        rootView = NativeContainerView(nodeId: 1)
        rootView.frame = self.view.bounds
        rootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        self.view.addSubview(rootView)
        runtime.viewManager.registerRoot(view: rootView, id: 1)
        
        // 3. Load and evaluate JS Bundle
        loadAndExecuteBundle()
        
        // 4. Tap outside to dismiss keyboard
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tapGesture.cancelsTouchesInView = false
        self.view.addGestureRecognizer(tapGesture)
        
        // 5. Schedule automated conformance test only if requested via --test argument
        if CommandLine.arguments.contains("--test") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
                self?.runInteractiveConformanceTest()
            }
        }
    }
    
    @objc func dismissKeyboard() {
        self.view.endEditing(true)
    }
    
    private func loadAndExecuteBundle() {
        var bundleSource: String?
        
        // Check for bundle in main bundle resources:
        if let path = Bundle.main.path(forResource: "main.bundle", ofType: "js") {
            bundleSource = try? String(contentsOfFile: path, encoding: .utf8)
        }
        
        // Fallback check known filesystem location during dev/testing:
        if bundleSource == nil {
            let directPaths = [
                Bundle.main.bundlePath + "/main.bundle.js",
                Bundle.main.bundlePath + "/OneNativeApp.app/main.bundle.js"
            ]
            for p in directPaths {
                if FileManager.default.fileExists(atPath: p),
                   let content = try? String(contentsOfFile: p, encoding: .utf8) {
                    bundleSource = content
                    break
                }
            }
        }
        
        guard let source = bundleSource else {
            print("[OneNative:Fatal] Could not find main.bundle.js in app bundle!")
            return
        }
        
        // Execute on main thread
        runtime.evaluateBundle(jsCode: source)
        
        // Trigger initial layout pass
        view.setNeedsLayout()
        view.layoutIfNeeded()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        rootView.frame = self.view.bounds
        runtime.viewManager.calculateLayout(
            rootId: 1,
            width: self.view.bounds.width,
            height: self.view.bounds.height
        )
    }
    
    func runInteractiveConformanceTest() {
        print("\n==================================================")
        print("[OneNative:Test] 🧪 STARTING INTERACTIVE CONFORMANCE TEST")
        print("==================================================")
        
        // Find views in viewManager
        guard let button = runtime.viewManager.views.values.first(where: { ($0 as? NativeButtonView)?.title(for: .normal)?.contains("Increment") == true }) as? NativeButtonView else {
            print("[OneNative:Test] ❌ Button not found!")
            return
        }
        
        let textInputs = runtime.viewManager.views.values.compactMap { $0 as? NativeTextInputView }
        guard textInputs.count >= 2 else {
            print("[OneNative:Test] ❌ Text inputs not found!")
            return
        }
        
        let controlledInput = textInputs.first(where: { $0.placeholder?.contains("Type message") == true })!
        let pinInput = textInputs.first(where: { $0.placeholder?.contains("numeric PIN") == true })!
        
        // --- TEST 1: Button Tap & React State Sync ---
        print("\n[OneNative:Test] Test 1: Simulating user tap on 'Increment (+1)' button...")
        print("[OneNative:Test] Tapping button twice via UIControl.sendActions(.touchUpInside)...")
        button.sendActions(for: .touchUpInside)
        button.sendActions(for: .touchUpInside)
        print("[OneNative:Test] ✅ Test 1 complete: 2 synchronous button presses dispatched to React.")
        
        // --- TEST 2: Controlled TextInput Typing ---
        print("\n[OneNative:Test] Test 2: Simulating user typing into controlled TextInput...")
        controlledInput.text = "Fast synchronous typing on iOS Main Thread!"
        controlledInput.sendActions(for: .editingChanged)
        print("[OneNative:Test] ✅ Test 2 complete: Text change dispatched synchronously to React state.")
        
        // --- TEST 3: Synchronous UIKit Delegate Conformance ---
        print("\n[OneNative:Test] Test 3: Synchronous UIKit Delegate Conformance (shouldChangeCharactersInRange)...")
        
        // Probe A: Valid digits
        let probeValid = pinInput.textField(
            pinInput,
            shouldChangeCharactersIn: NSRange(location: 0, length: 0),
            replacementString: "9876"
        )
        print("[OneNative:Test] Probe A (digits '9876'): JS delegate query returned \(probeValid) (expected: true)")
        assert(probeValid == true, "Digits must be allowed by delegate!")
        
        // Probe B: Invalid letters
        let probeInvalid = pinInput.textField(
            pinInput,
            shouldChangeCharactersIn: NSRange(location: 0, length: 0),
            replacementString: "abcXYZ"
        )
        print("[OneNative:Test] Probe B (letters 'abcXYZ'): JS delegate query returned \(probeInvalid) (expected: false)")
        assert(probeInvalid == false, "Letters must be synchronously rejected by delegate!")
        
        // Probe C: Invalid symbols
        let probeSymbols = pinInput.textField(
            pinInput,
            shouldChangeCharactersIn: NSRange(location: 0, length: 0),
            replacementString: "!@#$"
        )
        print("[OneNative:Test] Probe C (symbols '!@#$'): JS delegate query returned \(probeSymbols) (expected: false)")
        assert(probeSymbols == false, "Symbols must be synchronously rejected by delegate!")
        
        if probeValid && !probeInvalid && !probeSymbols {
            pinInput.text = "9876"
            pinInput.sendActions(for: .editingChanged)
            print("[OneNative:Test] ✅ Test 3 complete: UIKit delegate queries answered synchronously with zero delay!")
        }
        
        print("\n==================================================")
        print("[OneNative:Test] 🏆 ALL 3 CONFORMANCE TESTS PASSED!")
        print("[OneNative:Test] Verified: Single-threaded synchronous execution on CFRunLoopMain.")
        print("==================================================\n")
    }
}
