import SwiftUI
import UIKit

private struct GeometryReaderSnapshot: Equatable {
  var frame: CGRect
  var localFrame: CGRect
  var size: CGSize
  var insets: EdgeInsets
}

private final class GeometryReaderModel: ObservableObject {
  var active = false
  var latest: GeometryReaderSnapshot?
  var onGeometry: ((GeometryReaderSnapshot) -> Void)?

  func emit(_ snapshot: GeometryReaderSnapshot) {
    latest = snapshot
    if active { onGeometry?(snapshot) }
  }

  func setActive(_ active: Bool) {
    self.active = active
    if active, let latest { onGeometry?(latest) }
  }
}

private struct GeometryReaderContent: View {
  @ObservedObject var model: GeometryReaderModel
  @ObservedObject var children: OneNativeChildren
  @ObservedObject var style: OneNativeContainerStyle

  var body: some View {
    GeometryReader { _ in
      ForEach(children.items) { child in child.content }
    }
    // report the native layout size separately from coordinate-space bounds.
    // the observer fires when frames, size or safe-area insets change.
    .onGeometryChange(for: GeometryReaderSnapshot.self) { proxy in
      GeometryReaderSnapshot(
        frame: proxy.frame(in: .global), localFrame: proxy.frame(in: .local),
        size: proxy.size, insets: proxy.safeAreaInsets)
    } action: { snapshot in
      model.emit(snapshot)
    }
    .oneNativeContainerStyle(style)
  }
}

@objcMembers
public final class OneNativeGeometryReaderView: OneNativeContainerView {
  public var onGeometry:
    ((CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat) -> Void)?
  private let model: GeometryReaderModel

  public init() {
    let model = GeometryReaderModel()
    self.model = model
    super.init(styled: { children, style, _ in
      AnyView(GeometryReaderContent(model: model, children: children, style: style))
    })
    model.onGeometry = { [weak self] snapshot in
      let frame = snapshot.frame
      let local = snapshot.localFrame
      let insets = snapshot.insets
      self?.onGeometry?(
        frame.origin.x, frame.origin.y, frame.size.width, frame.size.height,
        local.origin.x, local.origin.y, local.size.width, local.size.height,
        snapshot.size.width, snapshot.size.height,
        insets.top, insets.leading, insets.bottom, insets.trailing)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func setActive(_ active: Bool) { model.setActive(active) }

  public override func reset() {
    model.latest = nil
    super.reset()
  }
}
