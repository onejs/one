import AppKit

@objc(OneMacButtonHostView)
final class OneMacButtonHostView: NSView, OneMacosButtonHosting {
  private let button = NSButton(title: "", target: nil, action: nil)
  @objc var onPress: (() -> Void)?
  @objc var title = "" { didSet { button.title = title } }
  @objc var systemImage = "" {
    didSet {
      button.image = systemImage.isEmpty ? nil : NSImage(systemSymbolName: systemImage, accessibilityDescription: nil)
      button.imagePosition = title.isEmpty ? .imageOnly : .imageLeading
    }
  }
  @objc var disabled = false { didSet { button.isEnabled = !disabled } }
  @objc var bordered = true { didSet { button.isBordered = bordered } }

  override init(frame: NSRect) {
    super.init(frame: frame)
    button.bezelStyle = .rounded
    button.setButtonType(.momentaryPushIn)
    button.target = self
    button.action = #selector(press)
    button.autoresizingMask = [.width, .height]
    button.frame = bounds
    addSubview(button)
    setAccessibilityElement(false)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  @objc private func press() {
    guard !disabled else { return }
    onPress?()
  }

  override func accessibilityPerformPress() -> Bool {
    guard !disabled else { return false }
    button.performClick(nil)
    return true
  }
}

@objc(OneMacSegmentedControlHostView)
final class OneMacSegmentedControlHostView: NSView, OneMacosSegmentedControlHosting {
  private let control = NSSegmentedControl()
  private var controlled = OneNativeControlled(-1)
  @objc var onChange: ((Int, Int, Int) -> Void)?
  @objc var disabled = false { didSet { control.isEnabled = !disabled } }
  @objc var controlRole = "automatic" {
    didSet {
      if #available(macOS 27.0, *) {
        switch controlRole {
        case "tabs": control.role = .tabs
        case "valueSelection": control.role = .valueSelection
        default: control.role = .automatic
        }
        control.segmentStyle = controlRole == "automatic" ? .rounded : .automatic
      }
    }
  }
  @objc var labels: [String] = [] {
    didSet {
      control.segmentCount = labels.count
      for (index, label) in labels.enumerated() {
        control.setLabel(label, forSegment: index)
      }
      displayValue()
    }
  }

  override init(frame: NSRect) {
    super.init(frame: frame)
    control.trackingMode = .selectOne
    control.segmentStyle = .rounded
    control.target = self
    control.action = #selector(selectSegment)
    control.autoresizingMask = [.width, .height]
    control.frame = bounds
    addSubview(control)
    setAccessibilityElement(false)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  private func displayValue() {
    control.selectedSegment = labels.indices.contains(controlled.value) ? controlled.value : -1
  }

  @objc func applyValue(_ value: Int, acknowledged: Int, revision: Int) {
    if let next = controlled.applying(value, acknowledged: acknowledged, revision: revision) {
      controlled = next
    }
    displayValue()
  }

  @objc private func selectSegment() {
    guard !disabled, labels.indices.contains(control.selectedSegment) else { return }
    guard controlled.change(control.selectedSegment) else { return }
    onChange?(controlled.value, controlled.eventCount, controlled.revision)
  }
}
