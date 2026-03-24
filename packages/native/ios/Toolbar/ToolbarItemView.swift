// adapted from expo-router (MIT license) - https://github.com/expo/expo
import React

import UIKit

@objc(ToolbarItemView) public
class ToolbarItemView: RCTView {
  // MARK: - internal state
  var itemIdentifier: String = ""
  var host: ToolbarHostView?
  private var currentBarButtonItem: UIBarButtonItem?
  @objc var onSelected: RCTDirectEventBlock?

  // MARK: - props set from RN via @objc

  @objc var identifier: NSString = "" {
    didSet { itemIdentifier = identifier as String }
  }

  private var _type: ItemType?
  @objc var type: NSString? {
    didSet {
      if let t = type as String? { _type = ItemType(rawValue: t) } else { _type = nil }
      performRebuild()
    }
  }

  @objc var title: NSString? {
    didSet { performUpdate() }
  }

  @objc var systemImageName: NSString? {
    didSet { performUpdate() }
  }

  @objc var xcassetName: NSString? {
    didSet { performUpdate() }
  }

  @objc var imageSource: NSDictionary? {
    didSet { resolveImage() }
  }

  private var resolvedImage: UIImage?

  private func resolveImage() {
    guard let source = imageSource, let uriObj = source["uri"] else {
      resolvedImage = nil
      performUpdate()
      return
    }
    guard let uri = uriObj as? String, !uri.isEmpty, let url = URL(string: uri) else {
      resolvedImage = nil
      performUpdate()
      return
    }
    URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
      guard let data = data, let image = UIImage(data: data) else { return }
      DispatchQueue.main.async {
        self?.resolvedImage = image
        self?.performUpdate()
      }
    }.resume()
  }

  @objc var tintColor_: UIColor? {
    didSet { performUpdate() }
  }
  // we use customTintColor internally to avoid conflict with UIView.tintColor
  var customTintColor: UIColor? { return tintColor_ }

  private var _imageRenderingMode: ImageRenderingMode?
  @objc var imageRenderingMode: NSString? {
    didSet {
      if let m = imageRenderingMode as String? { _imageRenderingMode = ImageRenderingMode(rawValue: m) } else { _imageRenderingMode = nil }
      performUpdate()
    }
  }

  @objc var hidesSharedBackground: Bool = false {
    didSet { performUpdate() }
  }

  @objc var sharesBackground: Bool = true {
    didSet { performUpdate() }
  }

  private var _barButtonItemStyle: UIBarButtonItem.Style?
  @objc var barButtonItemStyle: NSString? {
    didSet {
      if let s = barButtonItemStyle as String? {
        _barButtonItemStyle = BarItemStyle(rawValue: s)?.toUIBarButtonItemStyle()
      } else {
        _barButtonItemStyle = nil
      }
      performUpdate()
    }
  }

  @objc var width: NSNumber? {
    didSet { performUpdate() }
  }

  @objc var routerHidden: Bool = false {
    didSet { performUpdate() }
  }

  @objc var selected: Bool = false {
    didSet { performUpdate() }
  }

  @objc var badgeConfiguration: NSDictionary? {
    didSet {
      _badgeConfig = parseBadgeConfiguration(badgeConfiguration)
      performUpdate()
    }
  }
  private var _badgeConfig: BadgeConfiguration?

  @objc var titleStyle: NSDictionary? {
    didSet {
      _titleStyle = parseTitleStyle(titleStyle)
      performUpdate()
    }
  }
  private var _titleStyle: TitleStyle?

  // use unique names to avoid conflict with UIView's built-in accessibility properties
  @objc var routerAccessibilityLabel: NSString? {
    didSet { performUpdate() }
  }

  @objc var routerAccessibilityHint: NSString? {
    didSet { performUpdate() }
  }

  @objc var disabled: Bool = false {
    didSet { performUpdate() }
  }

  // MARK: - custom view child

  private var customView: UIView? {
    didSet { performRebuild() }
  }

  // MARK: - update / rebuild

  func performRebuild() {
    guard self.host != nil else { return }
    rebuildBarButtonItem()
    self.host?.updateToolbarItems()
  }

  func performUpdate() {
    guard self.host != nil else { return }
    updateBarButtonItem()
    self.host?.updateToolbarItems()
  }

  @objc func handleAction() {
    onSelected?([:])
  }

  var barButtonItem: UIBarButtonItem {
    if let item = currentBarButtonItem { return item }
    rebuildBarButtonItem()
    return currentBarButtonItem ?? UIBarButtonItem()
  }

  private func updateBarButtonItem() {
    guard let item = currentBarButtonItem else { rebuildBarButtonItem(); return }
    applyContentProperties(to: item)
    applyCommonProperties(to: item)
  }

  private func rebuildBarButtonItem() {
    var item = UIBarButtonItem()
    if let customView { item = UIBarButtonItem(customView: customView) }
    else if _type == .fluidSpacer { item = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil) }
    else if _type == .fixedSpacer { item = UIBarButtonItem(barButtonSystemItem: .fixedSpace, target: nil, action: nil) }
    else if _type == .searchBar {
      guard #available(iOS 26.0, *), let controller = self.host?.findViewController() else {
        currentBarButtonItem = nil; return
      }
      guard let navController = controller.navigationController, navController.isNavigationBarHidden == false else {
        currentBarButtonItem = nil; return
      }
      item = controller.navigationItem.searchBarPlacementBarButtonItem
    } else {
      applyContentProperties(to: item)
    }
    item.target = self
    item.action = #selector(handleAction)
    applyCommonProperties(to: item)
    currentBarButtonItem = item
  }

  private func applyContentProperties(to item: UIBarButtonItem) {
    if _type == .normal || _type == nil {
      item.title = (title as String?) ?? ""
      if let resolvedImage = resolvedImage {
        let renderingMode: UIImage.RenderingMode = _imageRenderingMode == .template ? .alwaysTemplate : .alwaysOriginal
        item.image = resolvedImage.withRenderingMode(renderingMode)
      } else if let xcassetName = xcassetName as String? {
        let renderingMode: UIImage.RenderingMode = _imageRenderingMode == .template ? .alwaysTemplate : .alwaysOriginal
        item.image = UIImage(named: xcassetName)?.withRenderingMode(renderingMode)
      } else if let systemImageName = systemImageName as String? {
        item.image = UIImage(systemName: systemImageName)
      } else { item.image = nil }
      item.tintColor = customTintColor
      if let titleStyle = _titleStyle { FontUtils.setTitleStyle(fromConfig: titleStyle, for: item) }
      else { FontUtils.clearTitleStyle(for: item) }
    }
  }

  private func applyCommonProperties(to item: UIBarButtonItem) {
    if #available(iOS 26.0, *) {
      item.hidesSharedBackground = hidesSharedBackground
      item.sharesBackground = sharesBackground
    }
    item.style = _barButtonItemStyle ?? .plain
    item.width = width.map { CGFloat($0.doubleValue) } ?? 0
    item.isSelected = selected
    item.accessibilityLabel = routerAccessibilityLabel as String?
    item.accessibilityHint = routerAccessibilityHint as String?
    item.isEnabled = !disabled
    if #available(iOS 26.0, *) {
      if let badgeConfig = _badgeConfig {
        var badge = UIBarButtonItem.Badge.indicator()
        if let value = badgeConfig.value { badge = .string(value) }
        if let backgroundColor = badgeConfig.backgroundColor { badge.backgroundColor = backgroundColor }
        if let foregroundColor = badgeConfig.color { badge.foregroundColor = foregroundColor }
        if badgeConfig.fontFamily != nil || badgeConfig.fontSize != nil || badgeConfig.fontWeight != nil {
          badge.font = FontUtils.convertTitleStyleToFont(TitleStyle(
            fontFamily: badgeConfig.fontFamily, fontSize: badgeConfig.fontSize, fontWeight: badgeConfig.fontWeight))
        }
        item.badge = badge
      } else { item.badge = nil }
    }
  }

  public override func insertReactSubview(_ subview: UIView!, at atIndex: Int) {
    guard customView == nil else { return }
    customView = subview
  }

  public override func removeReactSubview(_ subview: UIView!) {
    if customView === subview { subview.removeFromSuperview(); customView = nil }
  }
}

// MARK: - enums and structs (no Expo dependency)

enum ItemType: String {
  case normal
  case fixedSpacer
  case fluidSpacer
  case searchBar
}

enum BarItemStyle: String {
  case plain
  case prominent

  func toUIBarButtonItemStyle() -> UIBarButtonItem.Style {
    switch self {
    case .plain: return .plain
    case .prominent:
      if #available(iOS 26.0, *) { return .prominent }
      else { return .done }
    }
  }
}

enum ImageRenderingMode: String {
  case template
  case original
}

struct BadgeConfiguration: Equatable {
  var value: String?
  var backgroundColor: UIColor?
  var color: UIColor?
  var fontFamily: String?
  var fontSize: Double?
  var fontWeight: String?
}

struct TitleStyle: Equatable {
  var fontFamily: String?
  var fontSize: Double?
  var fontWeight: String?
  var color: UIColor?
}

// MARK: - dict -> struct helpers

func parseBadgeConfiguration(_ dict: NSDictionary?) -> BadgeConfiguration? {
  guard let dict = dict else { return nil }
  return BadgeConfiguration(
    value: dict["value"] as? String,
    backgroundColor: parseColor(dict["backgroundColor"]),
    color: parseColor(dict["color"]),
    fontFamily: dict["fontFamily"] as? String,
    fontSize: dict["fontSize"] as? Double,
    fontWeight: dict["fontWeight"] as? String
  )
}

func parseTitleStyle(_ dict: NSDictionary?) -> TitleStyle? {
  guard let dict = dict else { return nil }
  return TitleStyle(
    fontFamily: dict["fontFamily"] as? String,
    fontSize: dict["fontSize"] as? Double,
    fontWeight: dict["fontWeight"] as? String,
    color: parseColor(dict["color"])
  )
}

func parseColor(_ value: Any?) -> UIColor? {
  guard let value = value else { return nil }
  if let color = value as? UIColor { return color }
  if let num = value as? NSNumber {
    // RN passes colors as processed integers
    let intVal = num.uint32Value
    let a = CGFloat((intVal >> 24) & 0xFF) / 255.0
    let r = CGFloat((intVal >> 16) & 0xFF) / 255.0
    let g = CGFloat((intVal >> 8) & 0xFF) / 255.0
    let b = CGFloat(intVal & 0xFF) / 255.0
    return UIColor(red: r, green: g, blue: b, alpha: a)
  }
  return nil
}
