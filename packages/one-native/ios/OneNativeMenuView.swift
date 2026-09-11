import UIKit

@objcMembers
public final class OneNativeMenuView: UIView {
  public var onAction: ((String) -> Void)?
  private let button = UIButton(type: .custom)
  private weak var trigger: UIView?
  private var activeActions = Set<String>()
  private var generation = 0
  private var currentItems: NSArray = []
  private var currentTitle = ""

  public override init(frame: CGRect) {
    super.init(frame: frame)
    button.showsMenuAsPrimaryAction = true
    button.accessibilityTraits = .button
    addSubview(button)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is unavailable")
  }

  public func mountTrigger(_ view: UIView) {
    precondition(trigger == nil, "Swift.Menu expects one trigger container")
    trigger = view
    insertSubview(view, belowSubview: button)
  }

  public func unmountTrigger(_ view: UIView) {
    view.removeFromSuperview()
    if trigger === view { trigger = nil }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    button.frame = bounds
  }

  public func configureItems(_ items: [[String: Any]], title: String, triggerLabel: String, disabled: Bool) {
    button.accessibilityLabel = triggerLabel
    button.isEnabled = !disabled
    guard !currentItems.isEqual(to: items) || currentTitle != title else { return }
    currentItems = items as NSArray
    currentTitle = title
    activeActions = Set(items.compactMap { item in
      item["type"] as! String == "action" && !(item["disabled"] as! Bool) && !(item["hidden"] as! Bool)
        ? item["id"] as? String : nil
    })
    let generation = self.generation
    // build once per Fabric prop transaction; retain sibling order within each parent.
    let grouped = Dictionary(grouping: items) { $0["parentId"] as! String }
    func elements(_ parent: String) -> [UIMenuElement] {
      (grouped[parent] ?? []).map { item in
        let id = item["id"] as! String
        let title = item["title"] as! String
        let symbol = item["systemImage"] as! String
        let image = symbol.isEmpty ? nil : UIImage(systemName: symbol)
        let element: UIMenuElement
        if item["type"] as! String == "submenu" {
          var options: UIMenu.Options = []
          if item["displayInline"] as! Bool { options.insert(.displayInline) }
          if item["singleSelection"] as! Bool { options.insert(.singleSelection) }
          if item["displayAsPalette"] as! Bool { options.insert(.displayAsPalette) }
          if item["destructive"] as! Bool { options.insert(.destructive) }
          let menu = UIMenu(title: title, image: image, identifier: UIMenu.Identifier(id), options: options, children: elements(id))
          switch item["preferredElementSize"] as! String {
          case "small": menu.preferredElementSize = .small
          case "medium": menu.preferredElementSize = .medium
          case "large": menu.preferredElementSize = .large
          default: menu.preferredElementSize = .automatic
          }
          element = menu
        } else {
          var attributes: UIMenuElement.Attributes = []
          if item["disabled"] as! Bool { attributes.insert(.disabled) }
          if item["destructive"] as! Bool { attributes.insert(.destructive) }
          if item["hidden"] as! Bool { attributes.insert(.hidden) }
          if item["keepsMenuPresented"] as! Bool { attributes.insert(.keepsMenuPresented) }
          let state: UIMenuElement.State
          switch item["state"] as! String {
          case "on": state = .on
          case "mixed": state = .mixed
          default: state = .off
          }
          let action = UIAction(title: title, image: image, identifier: UIAction.Identifier(id), discoverabilityTitle: item["discoverabilityTitle"] as? String, attributes: attributes, state: state) { [weak self] _ in
            guard let self, self.generation == generation, self.activeActions.contains(id), self.button.isEnabled else { return }
            self.onAction?(id)
          }
          element = action
        }
        let subtitle = item["subtitle"] as! String
        element.subtitle = subtitle.isEmpty ? nil : subtitle
        return element
      }
    }
    button.menu = UIMenu(title: title, children: elements(""))
  }

  public func reset() {
    generation += 1
    activeActions.removeAll()
    currentItems = []
    currentTitle = ""
    trigger?.removeFromSuperview()
    trigger = nil
    button.menu = nil
    button.accessibilityLabel = nil
  }
}
