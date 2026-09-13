import UIKit

protocol NativeBaseView: AnyObject {
    var nodeId: Int { get set }
    var styleProps: [String: Any] { get set }
    func applyProp(key: String, value: Any)
}

func parseColor(_ value: Any?) -> UIColor? {
    guard let hex = value as? String else { return nil }
    var cleanHex = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if cleanHex.hasPrefix("#") {
        cleanHex.removeFirst()
    }
    guard cleanHex.count == 6 || cleanHex.count == 8 else { return nil }
    var rgbValue: UInt64 = 0
    Scanner(string: cleanHex).scanHexInt64(&rgbValue)
    if cleanHex.count == 6 {
        return UIColor(
            red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
            alpha: 1.0
        )
    } else {
        return UIColor(
            red: CGFloat((rgbValue & 0xFF000000) >> 24) / 255.0,
            green: CGFloat((rgbValue & 0x00FF0000) >> 16) / 255.0,
            blue: CGFloat((rgbValue & 0x0000FF00) >> 8) / 255.0,
            alpha: CGFloat(rgbValue & 0x000000FF) / 255.0
        )
    }
}

func parseFont(size: Any?, weight: Any?) -> UIFont {
    let ptSize: CGFloat
    if let n = size as? NSNumber {
        ptSize = CGFloat(n.doubleValue)
    } else if let d = size as? Double {
        ptSize = CGFloat(d)
    } else {
        ptSize = 14.0
    }
    
    let fontWeight: UIFont.Weight
    if let w = weight as? String {
        switch w {
        case "bold", "700", "800": fontWeight = .bold
        case "600": fontWeight = .semibold
        case "500": fontWeight = .medium
        default: fontWeight = .regular
        }
    } else {
        fontWeight = .regular
    }
    return UIFont.systemFont(ofSize: ptSize, weight: fontWeight)
}

// Container View
class NativeContainerView: UIView, NativeBaseView {
    var nodeId: Int = 0
    var styleProps: [String: Any] = [:]
    
    init(nodeId: Int) {
        self.nodeId = nodeId
        super.init(frame: .zero)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func applyProp(key: String, value: Any) {
        if key == "style", let dict = value as? [String: Any] {
            self.styleProps = dict
            if let bg = dict["backgroundColor"] {
                self.backgroundColor = parseColor(bg)
            }
            if let br = dict["borderRadius"] as? NSNumber {
                self.layer.cornerRadius = CGFloat(br.doubleValue)
                self.clipsToBounds = true
            }
            if let bw = dict["borderWidth"] as? NSNumber {
                self.layer.borderWidth = CGFloat(bw.doubleValue)
            }
            if let bc = dict["borderColor"] {
                self.layer.borderColor = parseColor(bc)?.cgColor
            }
            if let op = dict["opacity"] as? NSNumber {
                self.alpha = CGFloat(op.doubleValue)
            }
        }
    }
}

// Text / Label View
class NativeTextView: UILabel, NativeBaseView {
    var nodeId: Int = 0
    var styleProps: [String: Any] = [:]
    
    init(nodeId: Int) {
        self.nodeId = nodeId
        super.init(frame: .zero)
        self.numberOfLines = 0
        self.textColor = .white
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func applyProp(key: String, value: Any) {
        if key == "text" {
            self.text = "\(value)"
        } else if key == "style", let dict = value as? [String: Any] {
            self.styleProps = dict
            if let color = dict["color"] {
                self.textColor = parseColor(color)
            }
            self.font = parseFont(size: dict["fontSize"], weight: dict["fontWeight"])
            if let align = dict["textAlign"] as? String {
                switch align {
                case "center": self.textAlignment = .center
                case "right": self.textAlignment = .right
                default: self.textAlignment = .left
                }
            }
        }
    }
}

// Button View
class NativeButtonView: UIButton, NativeBaseView {
    var nodeId: Int = 0
    var styleProps: [String: Any] = [:]
    weak var runtime: MainThreadJSRuntime?
    
    init(nodeId: Int, runtime: MainThreadJSRuntime?) {
        self.nodeId = nodeId
        self.runtime = runtime
        super.init(frame: .zero)
        self.addTarget(self, action: #selector(onTapped), for: .touchUpInside)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    @objc func onTapped() {
        runtime?.dispatchNativeEvent(nodeId: nodeId, eventName: "press", payload: nil)
    }
    
    func applyProp(key: String, value: Any) {
        if key == "title" {
            self.setTitle("\(value)", for: .normal)
        } else if key == "titleStyle", let dict = value as? [String: Any] {
            if let color = dict["color"] {
                self.setTitleColor(parseColor(color), for: .normal)
            }
            self.titleLabel?.font = parseFont(size: dict["fontSize"], weight: dict["fontWeight"])
        } else if key == "style", let dict = value as? [String: Any] {
            self.styleProps = dict
            if let bg = dict["backgroundColor"] {
                self.backgroundColor = parseColor(bg)
            }
            if let br = dict["borderRadius"] as? NSNumber {
                self.layer.cornerRadius = CGFloat(br.doubleValue)
                self.clipsToBounds = true
            }
            if let bw = dict["borderWidth"] as? NSNumber {
                self.layer.borderWidth = CGFloat(bw.doubleValue)
            }
            if let bc = dict["borderColor"] {
                self.layer.borderColor = parseColor(bc)?.cgColor
            }
        }
    }
}

// TextInput View
class NativeTextInputView: UITextField, NativeBaseView, UITextFieldDelegate {
    var nodeId: Int = 0
    var styleProps: [String: Any] = [:]
    weak var runtime: MainThreadJSRuntime?
    var padding = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
    var normalBorderColor: CGColor?
    var normalBorderWidth: CGFloat = 1.0
    
    init(nodeId: Int, runtime: MainThreadJSRuntime?) {
        self.nodeId = nodeId
        self.runtime = runtime
        super.init(frame: .zero)
        self.delegate = self
        self.autocorrectionType = .no
        self.autocapitalizationType = .none
        self.tintColor = UIColor(red: 56/255.0, green: 189/255.0, blue: 248/255.0, alpha: 1.0)
        self.keyboardAppearance = .dark
        self.returnKeyType = .done
        self.clearButtonMode = .whileEditing
        self.addTarget(self, action: #selector(textChanged), for: .editingChanged)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func textRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: padding)
    }
    
    override func editingRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: padding)
    }
    
    override func placeholderRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: padding)
    }
    
    @objc func textChanged() {
        runtime?.dispatchNativeEvent(nodeId: nodeId, eventName: "changeText", payload: self.text ?? "")
    }
    
    func textFieldDidBeginEditing(_ textField: UITextField) {
        UIView.animate(withDuration: 0.15) {
            self.layer.borderColor = UIColor(red: 56/255.0, green: 189/255.0, blue: 248/255.0, alpha: 1.0).cgColor
            self.layer.borderWidth = 2.0
        }
    }
    
    func textFieldDidEndEditing(_ textField: UITextField) {
        UIView.animate(withDuration: 0.15) {
            self.layer.borderColor = self.normalBorderColor ?? UIColor(red: 51/255.0, green: 65/255.0, blue: 85/255.0, alpha: 1.0).cgColor
            self.layer.borderWidth = self.normalBorderWidth
        }
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }
    
    // Synchronous UIKit Delegate Protocol Conformance!
    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
        guard let rt = runtime else { return true }
        // Synchronously invokes JavaScript on the Main Thread and gets immediate boolean:
        let allowed = rt.shouldChangeText(nodeId: nodeId, location: range.location, length: range.length, replacement: string)
        return allowed
    }
    
    func applyProp(key: String, value: Any) {
        if key == "value" {
            let newText = "\(value)"
            // Only update if actually different to avoid disturbing cursor position:
            if self.text != newText {
                self.text = newText
            }
        } else if key == "placeholder" {
            self.placeholder = "\(value)"
        } else if key == "placeholderTextColor" {
            if let color = parseColor(value), let ph = self.placeholder {
                self.attributedPlaceholder = NSAttributedString(
                    string: ph,
                    attributes: [.foregroundColor: color]
                )
            }
        } else if key == "keyboardType", let kt = value as? String {
            if kt == "number-pad" {
                self.keyboardType = .numberPad
            } else {
                self.keyboardType = .default
            }
        } else if key == "style", let dict = value as? [String: Any] {
            self.styleProps = dict
            if let bg = dict["backgroundColor"] {
                self.backgroundColor = parseColor(bg)
            }
            if let color = dict["color"] {
                self.textColor = parseColor(color)
            }
            self.font = parseFont(size: dict["fontSize"], weight: dict["fontWeight"])
            if let br = dict["borderRadius"] as? NSNumber {
                self.layer.cornerRadius = CGFloat(br.doubleValue)
                self.clipsToBounds = true
            }
            if let bw = dict["borderWidth"] as? NSNumber {
                let w = CGFloat(bw.doubleValue)
                self.normalBorderWidth = w
                if !self.isFirstResponder {
                    self.layer.borderWidth = w
                }
            }
            if let bc = dict["borderColor"] {
                let color = parseColor(bc)?.cgColor
                self.normalBorderColor = color
                if !self.isFirstResponder {
                    self.layer.borderColor = color
                }
            }
            if let px = dict["paddingHorizontal"] as? NSNumber {
                let p = CGFloat(px.doubleValue)
                self.padding = UIEdgeInsets(top: 0, left: p, bottom: 0, right: p)
            }
        }
    }
}
