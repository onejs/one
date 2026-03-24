// adapted from expo-router (MIT license) - https://github.com/expo/expo
import React

// RNSScreen accessed via responder chain without direct import
import UIKit

@objc(ToolbarHostView) public
class ToolbarHostView: RCTView, MenuUpdatable {
  private weak var cachedController: UIViewController?
  var toolbarItemsArray: [String] = []
  var toolbarItemsMap: [String: ToolbarItemView] = [:]
  var menuItemsMap: [String: MenuActionView] = [:]
  private var hasPendingToolbarUpdate = false

  private func addToolbarItemAtIndex(_ item: ToolbarItemView, index: Int) {
    let identifier = item.itemIdentifier
    toolbarItemsArray.insert(identifier, at: index)
    toolbarItemsMap[identifier] = item
    item.host = self
  }

  private func addMenuItemAtIndex(_ item: MenuActionView, index: Int) {
    let identifier = item.menuIdentifier
    toolbarItemsArray.insert(identifier, at: index)
    menuItemsMap[identifier] = item
  }

  private func removeItemWithId(_ id: String) {
    if let index = toolbarItemsArray.firstIndex(of: id) {
      toolbarItemsArray.remove(at: index)
      toolbarItemsMap.removeValue(forKey: id)
      menuItemsMap.removeValue(forKey: id)
    }
  }

  func updateToolbarItems() {
    if hasPendingToolbarUpdate { return }
    hasPendingToolbarUpdate = true
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.hasPendingToolbarUpdate = false
      self.performToolbarUpdate()
    }
  }

  private func performToolbarUpdate() {
    if let controller = self.findViewController() {
      if #available(iOS 18.0, *) {
        let items = toolbarItemsArray.compactMap { identifier -> UIBarButtonItem? in
          if let item = toolbarItemsMap[identifier] {
            if item.routerHidden { return nil }
            return item.barButtonItem
          }
          if let menu = menuItemsMap[identifier] {
            if menu.routerHidden { return nil }
            let item = UIBarButtonItem(
              title: menu.menuLabel, image: menu.image, primaryAction: nil, menu: menu.uiAction as? UIMenu)
            item.preferredMenuElementOrder = .fixed
            if #available(iOS 26.0, *) {
              if let hidesSharedBackground = menu.menuHidesSharedBackground { item.hidesSharedBackground = hidesSharedBackground }
              if let sharesBackground = menu.menuSharesBackground { item.sharesBackground = sharesBackground }
            }
            if let titleStyle = menu.menuTitleStyle {
              FontUtils.setTitleStyle(fromConfig: titleStyle, for: item)
            }
            item.isEnabled = !menu.menuDisabled
            if let accessibilityLabel = menu.menuAccessibilityLabel { item.accessibilityLabel = accessibilityLabel }
            else if let label = menu.menuLabel { item.accessibilityLabel = label }
            if let accessibilityHint = menu.menuAccessibilityHint { item.accessibilityHint = accessibilityHint }
            item.tintColor = menu.menuCustomTintColor
            if let style = menu.menuBarButtonItemStyle { item.style = style }
            return item
          }
          return nil
        }
        controller.setToolbarItems(items, animated: true)
        controller.navigationController?.setToolbarHidden(false, animated: true)
      }
    }
  }

  public override func insertReactSubview(_ subview: UIView!, at atIndex: Int) {
    if let toolbarItem = subview as? ToolbarItemView {
      if toolbarItem.itemIdentifier.isEmpty { return }
      addToolbarItemAtIndex(toolbarItem, index: atIndex)
    } else if let menu = subview as? MenuActionView {
      menu.parentMenuUpdatable = self
      addMenuItemAtIndex(menu, index: atIndex)
    }
    updateToolbarItems()
  }

  public override func removeReactSubview(_ subview: UIView!) {
    if let toolbarItem = subview as? ToolbarItemView {
      if toolbarItem.itemIdentifier.isEmpty { return }
      removeItemWithId(toolbarItem.itemIdentifier)
    } else if let menu = subview as? MenuActionView {
      if menu.menuIdentifier.isEmpty { return }
      removeItemWithId(menu.menuIdentifier)
    }
    updateToolbarItems()
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      if let controller = cachedController { controller.setToolbarItems(nil, animated: true) }
      cachedController = nil
    } else {
      updateToolbarItems()
    }
  }

  func updateMenu() {
    updateToolbarItems()
  }

  func findViewController() -> UIViewController? {
    if let cached = cachedController { return cached }
    let rnsScreenClass: AnyClass? = NSClassFromString("RNSScreen")
    var responder: UIResponder? = self
    while let r = responder {
      if let vc = r as? UIViewController {
        if let rnsClass = rnsScreenClass, vc.isKind(of: rnsClass) {
          cachedController = vc; return vc
        }
      }
      responder = r.next
    }
    // fallback
    responder = self
    while let r = responder {
      if let vc = r as? UIViewController { cachedController = vc; return vc }
      responder = r.next
    }
    return nil
  }
}
