// adapted from expo-router (MIT license) - https://github.com/expo/expo
import React

// RNSScreen accessed via NSClassFromString without direct import
import UIKit

// MARK: - singleton manager for zoom transition repositories

class VxrnNativeZoomManager {
  static let shared = VxrnNativeZoomManager()
  let sourceRepository = ZoomTransitionsSourceRepository()
  let alignmentViewRepository = ZoomTransitionsAlignmentViewRepository()
  private init() {}
}

// MARK: - source info

class SourceInfo {
  var alignment: CGRect?
  var animateAspectRatioChange: Bool
  weak var view: UIView?

  init(view: UIView, alignment: CGRect?, animateAspectRatioChange: Bool) {
    self.view = view
    self.alignment = alignment
    self.animateAspectRatioChange = animateAspectRatioChange
  }
}

// MARK: - repositories

class ZoomTransitionsSourceRepository {
  private var sources: [String: SourceInfo] = [:]
  private let lock = NSLock()

  func registerSource(identifier: String, source: SourceInfo) {
    lock.lock()
    defer { lock.unlock() }
    if sources[identifier] != nil {
      NSLog("[@vxrn/native] ZoomSource with identifier %@ is already registered.", identifier)
    }
    if !identifier.isEmpty {
      sources[identifier] = source
    }
  }

  func unregisterSource(identifier: String) {
    lock.lock()
    defer { lock.unlock() }
    sources.removeValue(forKey: identifier)
  }

  func getSource(identifier: String) -> SourceInfo? {
    lock.lock()
    defer { lock.unlock() }
    return sources[identifier]
  }

  func updateIdentifier(oldIdentifier: String, newIdentifier: String) {
    lock.lock()
    defer { lock.unlock() }
    if let source = sources[oldIdentifier] {
      if !newIdentifier.isEmpty {
        sources[newIdentifier] = source
      }
      sources.removeValue(forKey: oldIdentifier)
    }
  }

  func updateAlignment(identifier: String, alignment: CGRect?) {
    lock.lock()
    defer { lock.unlock() }
    if let source = sources[identifier], !identifier.isEmpty {
      source.alignment = alignment
    }
  }

  func updateAnimateAspectRatioChange(identifier: String, animateAspectRatioChange: Bool) {
    lock.lock()
    defer { lock.unlock() }
    if let source: SourceInfo = sources[identifier], !identifier.isEmpty {
      source.animateAspectRatioChange = animateAspectRatioChange
    }
  }
}

class ZoomTransitionsAlignmentViewRepository {
  private var alignmentViews: [String: WeakUIView] = [:]
  private let lock = NSLock()

  func addIfNotExists(identifier: String, alignmentView: UIView) {
    lock.lock()
    defer { lock.unlock() }
    if alignmentViews[identifier] == nil && !identifier.isEmpty {
      alignmentViews[identifier] = WeakUIView(view: alignmentView)
    }
  }

  func removeIfSame(identifier: String, alignmentView: UIView) {
    lock.lock()
    defer { lock.unlock() }
    if let existing = alignmentViews[identifier], existing.view === alignmentView {
      alignmentViews.removeValue(forKey: identifier)
    }
  }

  func get(identifier: String) -> UIView? {
    lock.lock()
    defer { lock.unlock() }
    return alignmentViews[identifier]?.view
  }

  private class WeakUIView {
    weak var view: UIView?
    init(view: UIView) {
      self.view = view
    }
  }
}

// MARK: - dismissal bounds rect (plain struct, no Expo Record)

struct DismissalBoundsRect {
  var minX: Double?
  var maxX: Double?
  var minY: Double?
  var maxY: Double?

  init(dict: NSDictionary?) {
    guard let dict = dict else { return }
    minX = dict["minX"] as? Double
    maxX = dict["maxX"] as? Double
    minY = dict["minY"] as? Double
    maxY = dict["maxY"] as? Double
  }
}

// MARK: - zoom transition source view

@objc(ZoomTransitionSourceView) public
class ZoomTransitionSourceView: RCTView {
  private var child: UIView?
  private var sourceRepository: ZoomTransitionsSourceRepository { VxrnNativeZoomManager.shared.sourceRepository }

  private var _identifier: String = ""
  @objc var identifier: NSString = "" {
    didSet {
      let newId = identifier as String
      let oldId = _identifier
      _identifier = newId
      guard newId != oldId else { return }
      if let child = child {
        if oldId.isEmpty {
          sourceRepository.registerSource(
            identifier: newId,
            source: SourceInfo(
              view: child, alignment: _alignment,
              animateAspectRatioChange: _animateAspectRatioChange))
        } else {
          sourceRepository.updateIdentifier(oldIdentifier: oldId, newIdentifier: newId)
        }
      } else {
        sourceRepository.unregisterSource(identifier: oldId)
      }
    }
  }

  private var _alignment: CGRect?
  @objc var alignment: NSDictionary? {
    didSet {
      if let dict = alignment {
        let x = dict["x"] as? Double ?? 0
        let y = dict["y"] as? Double ?? 0
        let width = dict["width"] as? Double ?? 0
        let height = dict["height"] as? Double ?? 0
        _alignment = CGRect(x: x, y: y, width: width, height: height)
      } else {
        _alignment = nil
      }
      if child != nil {
        sourceRepository.updateAlignment(identifier: _identifier, alignment: _alignment)
      }
    }
  }

  private var _animateAspectRatioChange: Bool = false
  @objc var animateAspectRatioChange: Bool = false {
    didSet {
      _animateAspectRatioChange = animateAspectRatioChange
      if child != nil {
        sourceRepository.updateAnimateAspectRatioChange(
          identifier: _identifier, animateAspectRatioChange: animateAspectRatioChange)
      }
    }
  }

  public override func insertReactSubview(_ subview: UIView!, at atIndex: Int) {
    guard child == nil else {
      NSLog("[@vxrn/native] ZoomSource can only have a single native child.")
      return
    }
    child = subview
    sourceRepository.registerSource(
      identifier: _identifier,
      source: SourceInfo(
        view: subview, alignment: _alignment,
        animateAspectRatioChange: _animateAspectRatioChange))
    super.insertReactSubview(subview, at: atIndex)
  }

  public override func removeReactSubview(_ subview: UIView!) {
    guard subview === self.child else { return }
    self.child = nil
    sourceRepository.unregisterSource(identifier: _identifier)
    super.removeReactSubview(subview)
  }
}

// MARK: - zoom transition alignment rect detector view

@objc(ZoomTransitionAlignmentRectDetectorView) public
class ZoomTransitionAlignmentRectDetectorView: RCTView {
  private var child: UIView?
  private var alignmentViewRepository: ZoomTransitionsAlignmentViewRepository { VxrnNativeZoomManager.shared.alignmentViewRepository }

  private var _identifier: String = ""
  @objc var identifier: NSString = "" {
    didSet {
      let newId = identifier as String
      let oldId = _identifier
      if oldId != newId && !oldId.isEmpty {
        NSLog("[@vxrn/native] AlignmentRectDetector does not support changing identifier.")
        return
      }
      _identifier = newId
      if let child = child {
        alignmentViewRepository.addIfNotExists(identifier: newId, alignmentView: child)
      }
    }
  }

  public override func insertReactSubview(_ subview: UIView!, at atIndex: Int) {
    guard child == nil else {
      NSLog("[@vxrn/native] ZoomTarget can only have a single native child.")
      return
    }
    if !_identifier.isEmpty {
      alignmentViewRepository.addIfNotExists(identifier: _identifier, alignmentView: subview)
    }
    self.child = subview
    super.insertReactSubview(subview, at: atIndex)
  }

  public override func removeReactSubview(_ subview: UIView!) {
    guard subview === self.child else { return }
    self.child = nil
    alignmentViewRepository.removeIfSame(identifier: _identifier, alignmentView: subview)
    super.removeReactSubview(subview)
  }
}

// MARK: - zoom transition enabler view

@objc(ZoomTransitionEnablerView) public
class ZoomTransitionEnablerView: RCTView {
  private var sourceRepository: ZoomTransitionsSourceRepository { VxrnNativeZoomManager.shared.sourceRepository }
  private var alignmentViewRepository: ZoomTransitionsAlignmentViewRepository { VxrnNativeZoomManager.shared.alignmentViewRepository }

  private var _zoomTransitionSourceIdentifier: String = ""
  @objc var zoomTransitionSourceIdentifier: NSString = "" {
    didSet {
      _zoomTransitionSourceIdentifier = zoomTransitionSourceIdentifier as String
    }
  }

  private var _dismissalBoundsRect: DismissalBoundsRect?
  @objc var dismissalBoundsRect: NSDictionary? {
    didSet {
      _dismissalBoundsRect = DismissalBoundsRect(dict: dismissalBoundsRect)
      if superview != nil {
        DispatchQueue.main.async { self.setupZoomTransition() }
      }
    }
  }

  public override func didMoveToSuperview() {
    super.didMoveToSuperview()
    if superview != nil {
      DispatchQueue.main.async { self.setupZoomTransition() }
    }
  }

  private func setupZoomTransition() {
    if _zoomTransitionSourceIdentifier.isEmpty {
      NSLog("[@vxrn/native] No zoomTransitionSourceIdentifier passed to ZoomTransitionEnabler.")
      return
    }
    if let controller = self.findViewController() {
      NSLog("[@vxrn/native] Found VC: %@ (class: %@) for zoom id: %@", controller.description, String(describing: type(of: controller)), _zoomTransitionSourceIdentifier)
      if #available(iOS 18.0, *) {
        let options = UIViewController.Transition.ZoomOptions()

        options.alignmentRectProvider = { context in
          guard let sourceInfo = self.sourceRepository.getSource(
            identifier: self._zoomTransitionSourceIdentifier)
          else { return nil }
          guard let alignmentView = self.alignmentViewRepository.get(
            identifier: self._zoomTransitionSourceIdentifier)
          else { return sourceInfo.alignment }

          let rect = alignmentView.convert(
            alignmentView.bounds, to: context.zoomedViewController.view)
          if sourceInfo.animateAspectRatioChange, let sourceView = sourceInfo.view {
            return self.calculateAdjustedRect(rect, toMatch: sourceView.bounds.size)
          }
          return rect
        }

        if let rect = _dismissalBoundsRect {
          options.interactiveDismissShouldBegin = { context in
            let location = context.location
            if let minX = rect.minX, location.x < minX { return false }
            if let maxX = rect.maxX, location.x > maxX { return false }
            if let minY = rect.minY, location.y < minY { return false }
            if let maxY = rect.maxY, location.y > maxY { return false }
            return true
          }
        }

        controller.preferredTransition = .zoom(options: options) { _ in
          let sourceInfo = self.sourceRepository.getSource(
            identifier: self._zoomTransitionSourceIdentifier)
          guard let view = sourceInfo?.view else {
            NSLog("[@vxrn/native] No source view found for identifier %@.", self._zoomTransitionSourceIdentifier)
            return nil
          }
          NSLog("[@vxrn/native] Zoom source view found: %@ for id: %@", view.description, self._zoomTransitionSourceIdentifier)
          return view
        }
        NSLog("[@vxrn/native] preferredTransition set to .zoom for VC: %@", controller.description)
        return
      }
    } else {
      NSLog("[@vxrn/native] No navigation controller found to enable zoom transition.")
    }
  }

  private func calculateAdjustedRect(_ rect: CGRect, toMatch sourceSize: CGSize) -> CGRect {
    guard sourceSize.width > 0, sourceSize.height > 0, rect.width > 0, rect.height > 0 else {
      return rect
    }
    let sourceAspectRatio = sourceSize.width / sourceSize.height
    let rectAspectRatio = rect.width / rect.height
    if abs(sourceAspectRatio - rectAspectRatio) < 0.001 { return rect }
    if rectAspectRatio > sourceAspectRatio {
      let adjustedWidth = rect.height * sourceAspectRatio
      return CGRect(x: rect.midX - (adjustedWidth / 2), y: rect.origin.y, width: adjustedWidth, height: rect.height)
    }
    let adjustedHeight = rect.width / sourceAspectRatio
    return CGRect(x: rect.origin.x, y: rect.midY - (adjustedHeight / 2), width: rect.width, height: adjustedHeight)
  }

  private func findViewController() -> UIViewController? {
    // find RNSScreen (react-native-screens VC) via class name to avoid import
    let rnsScreenClass: AnyClass? = NSClassFromString("RNSScreen")
    var responder: UIResponder? = self
    while let r = responder {
      if let vc = r as? UIViewController {
        // prefer RNSScreen if available, otherwise fall back to any VC
        if let rnsClass = rnsScreenClass, vc.isKind(of: rnsClass) {
          return vc
        }
      }
      responder = r.next
    }
    // fallback: return first VC found
    responder = self
    while let r = responder {
      if let vc = r as? UIViewController { return vc }
      responder = r.next
    }
    return nil
  }
}
