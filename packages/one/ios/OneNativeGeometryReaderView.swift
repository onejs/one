import SwiftUI
import UIKit

private final class GeometryReaderModel: ObservableObject {
  var active = false
  var onGeometry: ((CGRect) -> Void)?

  func emit(_ frame: CGRect) {
    if active { onGeometry?(frame) }
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
    // changes, so a static layout reports once on mount.
    .onGeometryChange(for: CGRect.self) { proxy in
      proxy.frame(in: .global)
    } action: { frame in
      model.emit(frame)
    }
  }
}

@objcMembers
public final class OneNativeGeometryReaderView: OneNativeContainerView {
  public var onGeometry: ((CGFloat, CGFloat, CGFloat, CGFloat) -> Void)?
  private let model: GeometryReaderModel

  public init() {
    let model = GeometryReaderModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(GeometryReaderContent(model: model, children: children))
    })
    model.onGeometry = { [weak self] frame in
      self?.onGeometry?(frame.origin.x, frame.origin.y, frame.size.width, frame.size.height)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func setActive(_ active: Bool) { model.active = active }
}
