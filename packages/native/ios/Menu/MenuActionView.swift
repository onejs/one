// adapted from expo-router (MIT license) - https://github.com/expo/expo
import React

import UIKit

protocol MenuUpdatable: AnyObject {
  func updateMenu()
}

enum MenuElementSize: String {
  case small
  case medium
  case large
  case auto

  @available(iOS 16.0, *)
  func toUIMenuElementSize() -> UIMenu.ElementSize {
    switch self {
    case .small: return .small
    case .medium: return .medium
    case .large: return .large
    case .auto:
      if #available(iOS 17.0, *) { return .automatic }
      else { return .medium }
    }
  }
}

@objc(MenuActionView) public
class MenuActionView: RCTView, MenuUpdatable {
  // MARK: - internal identifiers (avoid UIView property conflicts)
  var menuIdentifier: String = ""
  var menuLabel: String?
  var menuDisabled: Bool = false
  var menuTitleStyle: TitleStyle?
  var menuSharesBackground: Bool?
  var menuHidesSharedBackground: Bool?
  var menuCustomTintColor: UIColor?
  var menuBarButtonItemStyle: UIBarButtonItem.Style?
  var menuAccessibilityLabel: String?
  var menuAccessibilityHint: String?

  @objc var onSelected: RCTDirectEventBlock?
  weak var parentMenuUpdatable: MenuUpdatable?

  private var baseUiAction: UIAction
  private var menuAction: UIMenu
  private var subActions: [MenuActionView] = []

  var isMenuAction: Bool { return !subActions.isEmpty }
  var uiAction: UIMenuElement { isMenuAction ? menuAction : baseUiAction }

  // MARK: - resolved image

  private var resolvedImage: UIImage?

  var image: UIImage? {
    if let resolvedImage = resolvedImage {
      let renderingMode: UIImage.RenderingMode = _imageRenderingMode == .template ? .alwaysTemplate : .alwaysOriginal
      return resolvedImage.withRenderingMode(renderingMode)
    }
    if let xcassetName = _xcassetName {
      let renderingMode: UIImage.RenderingMode = _imageRenderingMode == .template ? .alwaysTemplate : .alwaysOriginal
      return UIImage(named: xcassetName)?.withRenderingMode(renderingMode)
    }
    if let icon = _icon { return UIImage(systemName: icon) }
    return nil
  }

  // MARK: - @objc props

  @objc var identifier: NSString = "" {
    didSet { menuIdentifier = identifier as String }
  }

  private var _title: String = ""
  @objc var title: NSString = "" {
    didSet {
      _title = title as String
      updateUiAction()
      updateMenu()
    }
  }

  @objc var label: NSString? {
    didSet {
      menuLabel = label as String?
      updateMenu()
    }
  }

  private var _icon: String?
  @objc var icon: NSString? {
    didSet {
      _icon = icon as String?
      updateUiAction()
      updateMenu()
    }
  }

  private var _xcassetName: String?
  @objc var xcassetName: NSString? {
    didSet {
      _xcassetName = xcassetName as String?
      updateUiAction()
      updateMenu()
    }
  }

  @objc var imageSource: NSDictionary? {
    didSet { resolveImageFromSource() }
  }

  private func resolveImageFromSource() {
    guard let source = imageSource, let uriObj = source["uri"] else {
      resolvedImage = nil
      updateUiAction()
      updateMenu()
      return
    }
    guard let uri = uriObj as? String, !uri.isEmpty, let url = URL(string: uri) else {
      resolvedImage = nil
      updateUiAction()
      updateMenu()
      return
    }
    URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
      guard let data = data, let image = UIImage(data: data) else { return }
      DispatchQueue.main.async {
        self?.resolvedImage = image
        self?.updateUiAction()
        self?.updateMenu()
      }
    }.resume()
  }

  private var _imageRenderingMode: ImageRenderingMode?
  @objc var imageRenderingMode: NSString? {
    didSet {
      if let m = imageRenderingMode as String? { _imageRenderingMode = ImageRenderingMode(rawValue: m) } else { _imageRenderingMode = nil }
      updateUiAction()
      updateMenu()
    }
  }

  private var _destructive: Bool?
  @objc var destructive: NSNumber? {
    didSet {
      _destructive = destructive?.boolValue
      updateUiAction()
      updateMenu()
    }
  }

  @objc var disabled: Bool = false {
    didSet {
      menuDisabled = disabled
      updateUiAction()
      updateMenu()
    }
  }

  private var _isOn: Bool?
  @objc var isOn: NSNumber? {
    didSet {
      _isOn = isOn?.boolValue
      updateUiAction()
    }
  }

  private var _keepPresented: Bool?
  @objc var keepPresented: NSNumber? {
    didSet {
      _keepPresented = keepPresented?.boolValue
      updateUiAction()
    }
  }

  private var _discoverabilityLabel: String?
  @objc var discoverabilityLabel: NSString? {
    didSet {
      _discoverabilityLabel = discoverabilityLabel as String?
      updateUiAction()
    }
  }

  private var _subtitle: String?
  @objc var subtitle: NSString? {
    didSet {
      _subtitle = subtitle as String?
      updateUiAction()
      updateMenu()
    }
  }

  @objc var singleSelection: Bool = false {
    didSet { updateMenu() }
  }

  @objc var displayAsPalette: Bool = false {
    didSet { updateMenu() }
  }

  @objc var displayInline: Bool = false {
    didSet { updateMenu() }
  }

  private var _preferredElementSize: MenuElementSize?
  @objc var preferredElementSize: NSString? {
    didSet {
      if let s = preferredElementSize as String? { _preferredElementSize = MenuElementSize(rawValue: s) } else { _preferredElementSize = nil }
      updateMenu()
    }
  }

  @objc var routerHidden: Bool = false {
    didSet {
      updateUiAction()
      updateMenu()
    }
  }

  @objc var titleStyleDict: NSDictionary? {
    didSet {
      menuTitleStyle = parseTitleStyle(titleStyleDict)
      updateMenu()
    }
  }

  @objc var sharesBackground: NSNumber? {
    didSet {
      menuSharesBackground = sharesBackground?.boolValue
      updateMenu()
    }
  }

  @objc var hidesSharedBackground: NSNumber? {
    didSet {
      menuHidesSharedBackground = hidesSharedBackground?.boolValue
      updateMenu()
    }
  }

  @objc var customTintColor: UIColor? {
    didSet {
      menuCustomTintColor = customTintColor
      updateUiAction()
      updateMenu()
    }
  }

  @objc var barButtonItemStyleProp: NSString? {
    didSet {
      if let s = barButtonItemStyleProp as String? {
        menuBarButtonItemStyle = BarItemStyle(rawValue: s)?.toUIBarButtonItemStyle()
      } else {
        menuBarButtonItemStyle = nil
      }
      updateMenu()
    }
  }

  @objc var accessibilityLabelForMenu: NSString? {
    didSet {
      menuAccessibilityLabel = accessibilityLabelForMenu as String?
      updateMenu()
    }
  }

  @objc var accessibilityHintForMenu: NSString? {
    didSet {
      menuAccessibilityHint = accessibilityHintForMenu as String?
      updateMenu()
    }
  }

  // MARK: - init

  override init(frame: CGRect) {
    baseUiAction = UIAction(title: "", handler: { _ in })
    menuAction = UIMenu(title: "", image: nil, options: [], children: [])
    super.init(frame: frame)
    clipsToBounds = true
    baseUiAction = UIAction(title: "", handler: { [weak self] _ in self?.onSelected?([:]) })
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  // MARK: - menu building

  func updateMenu() {
    let childActions = subActions.map { $0.uiAction }
    var options: UIMenu.Options = []
    if #available(iOS 17.0, *) { if displayAsPalette { options.insert(.displayAsPalette) } }
    if singleSelection { options.insert(.singleSelection) }
    if displayInline { options.insert(.displayInline) }
    if _destructive == true { options.insert(.destructive) }
    menuAction = UIMenu(title: _title, image: image, options: options, children: childActions)
    if let subtitle = _subtitle { menuAction.subtitle = subtitle }
    if #available(iOS 16.0, *) {
      if let preferredElementSize = _preferredElementSize {
        menuAction.preferredElementSize = preferredElementSize.toUIMenuElementSize()
      }
    }
    parentMenuUpdatable?.updateMenu()
  }

  func updateUiAction() {
    var attributes: UIMenuElement.Attributes = []
    if _destructive == true { attributes.insert(.destructive) }
    if disabled { attributes.insert(.disabled) }
    if routerHidden { attributes.insert(.hidden) }
    if #available(iOS 16.0, *) { if _keepPresented == true { attributes.insert(.keepsMenuPresented) } }
    baseUiAction.title = _title
    baseUiAction.image = image
    baseUiAction.attributes = attributes
    baseUiAction.state = _isOn == true ? .on : .off
    if let subtitle = _subtitle { baseUiAction.subtitle = subtitle }
    if let label = _discoverabilityLabel { baseUiAction.discoverabilityTitle = label }
    parentMenuUpdatable?.updateMenu()
  }

  // MARK: - child management

  public override func insertReactSubview(_ subview: UIView!, at atIndex: Int) {
    if let childActionView = subview as? MenuActionView {
      subActions.insert(childActionView, at: atIndex)
      childActionView.parentMenuUpdatable = self
    }
  }

  public override func removeReactSubview(_ subview: UIView!) {
    if let childActionView = subview as? MenuActionView {
      subActions.removeAll(where: { $0 === childActionView })
    }
  }
}
