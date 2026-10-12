import SwiftUI
import UIKit

private struct GeometryReaderSnapshot: Equatable {
  var frame: CGRect
  var insets: EdgeInsets
}

private final class GeometryReaderModel: ObservableObject {
  var active = false
  var onGeometry: ((CGRect, EdgeInsets) -> Void)?

  func emit(frame: CGRect, insets: EdgeInsets) {
    if active { onGeometry?(frame, insets) }
  }
}

private struct GeometryReaderContent: View {
  @ObservedObject var model: GeometryReaderModel
  @ObservedObject var children: OneNativeChildren

  var body: some View {
    GeometryReader { _ in
      ForEach(children.items) { child in child.content }
    }
    // the frame is global so readers report position as well as size; the
    // size is the reader's size. onGeometryChange only fires when the frame
    // or the safe-area insets change, so a static layout reports once on mount.
    .onGeometryChange(for: GeometryReaderSnapshot.self) { proxy in
      GeometryReaderSnapshot(
        frame: proxy.frame(in: .global), insets: proxy.safeAreaInsets)
    } action: { snapshot in
      model.emit(frame: snapshot.frame, insets: snapshot.insets)
    }
  }
}

@objcMembers
public final class OneNativeGeometryReaderView: OneNativeContainerView {
  public var onGeometry:
    ((CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat, CGFloat) -> Void)?
  private let model: GeometryReaderModel

  public init() {
    let model = GeometryReaderModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(GeometryReaderContent(model: model, children: children))
    })
    model.onGeometry = { [weak self] frame, insets in
      self?.onGeometry?(
        frame.origin.x, frame.origin.y, frame.size.width, frame.size.height,
        insets.top, insets.leading, insets.bottom, insets.trailing)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func setActive(_ active: Bool) { model.active = active }
}
