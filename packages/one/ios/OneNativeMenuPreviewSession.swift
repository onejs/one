import CoreGraphics
import Foundation

// the ownership behind OneNativeMenuView's context menu preview, free of UIKit
// so the MenuPreview SwiftPM harness compiles this exact file on macOS. UIKit
// binds it through the conformances beside OneNativeMenuView.
protocol OneNativeMenuPreviewContent: AnyObject {
  var previewHidden: Bool { get set }
  var previewFrame: CGRect { get set }
  func detachFromPreviewParent()
}

protocol OneNativeMenuPreviewHost: AnyObject {
  var previewPreferredSize: CGSize { get set }
  func attachPreview(_ content: any OneNativeMenuPreviewContent)
}

protocol OneNativeMenuPreviewAnimator {
  func addPreviewCompletion(_ completion: @escaping () -> Void)
}

// one mounting owner for initial, replacement, and re-presented mounting: the
// content unhides, joins the host, and takes the box in exactly one place. a
// dismissal completion dismantles only the presentation that is still live,
// so a recycle or re-presentation that lands first keeps its own content.
final class OneNativeMenuPreviewSession<Content: OneNativeMenuPreviewContent, Host: OneNativeMenuPreviewHost> {
  private(set) var content: Content?
  private(set) weak var host: Host?
  private var width = 0.0
  private var height = 0.0
  private var onLayout: ((CGRect) -> Void)?
  private let makeHost: () -> Host

  init(makeHost: @escaping () -> Host) {
    self.makeHost = makeHost
  }

  func mount(_ view: Content, onLayout: @escaping (CGRect) -> Void) {
    if let old = content, old !== view {
      old.detachFromPreviewParent()
      old.previewHidden = true
    }
    content = view
    self.onLayout = onLayout
    emitLayout()
    // a replacement that mounts mid-presentation joins the live controller.
    if let host, let box = box {
      show(view, box: box, in: host)
    }
  }

  func unmount(_ view: Content) {
    onLayout = nil
    if content === view { content = nil }
    view.detachFromPreviewParent()
  }

  func setSize(width: Double, height: Double) {
    guard width != self.width || height != self.height else { return }
    self.width = width
    self.height = height
    emitLayout()
    // a live resize re-boxes the presented content; visibility stays owned by
    // mounting and dismissal, never by a size update.
    if let host, let content, let box = box {
      host.previewPreferredSize = box.size
      content.previewFrame = box
    }
  }

  func present() -> Host? {
    guard let content, let box = box else { return nil }
    let host = makeHost()
    host.previewPreferredSize = box.size
    self.host = host
    show(content, box: box, in: host)
    return host
  }

  func end(animator: (any OneNativeMenuPreviewAnimator)?) {
    let endingContent = content
    let endingHost = host
    let dismantle = { [weak self] in
      guard let self else { return }
      // a recycle, replacement, or re-presentation after the dismissal started
      // owns the live content now; the ending cleanup must not touch it.
      guard content === endingContent, host === endingHost else { return }
      endingContent?.detachFromPreviewParent()
      endingContent?.previewHidden = true
      host = nil
    }
    guard let animator else { dismantle(); return }
    animator.addPreviewCompletion(dismantle)
  }

  func reset() {
    content?.detachFromPreviewParent()
    content = nil
    host = nil
    width = 0
    height = 0
    onLayout = nil
  }

  private var box: CGRect? {
    guard width > 0, height > 0 else { return nil }
    return CGRect(x: 0, y: 0, width: width, height: height)
  }

  // the preview lays out eagerly in its hidden marker, so the subtree has a
  // Yoga frame before the first long press reparents it into UIKit's preview
  // controller.
  private func emitLayout() {
    guard content != nil, let box = box else { return }
    onLayout?(box)
  }

  private func show(_ view: Content, box: CGRect, in host: Host) {
    view.previewHidden = false
    host.attachPreview(view)
    view.previewFrame = box
  }
}
