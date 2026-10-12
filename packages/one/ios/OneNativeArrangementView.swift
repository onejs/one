import SwiftUI
import UIKit

@objcMembers
public final class OneNativeArrangementModifiers: NSObject {
  public var splitRatio: NSNumber?
  public var splitMinHorizontal: NSNumber?
  public var splitIdealHorizontal: NSNumber?
  public var splitMaxHorizontal: NSNumber?
  public var splitMinVertical: NSNumber?
  public var splitIdealVertical: NSNumber?
  public var splitMaxVertical: NSNumber?
  public var splitMinWidth: NSNumber?
  public var splitIdealWidth: NSNumber?
  public var splitMaxWidth: NSNumber?
  public var splitMinHeight: NSNumber?
  public var splitIdealHeight: NSNumber?
  public var splitMaxHeight: NSNumber?
  public var splitFixedHorizontal: NSNumber?
  public var splitFixedVertical: NSNumber?
  public var overlayEdge: String?

  public override init() {
    super.init()
  }

  public init(
    splitRatio: NSNumber? = nil,
    splitMinHorizontal: NSNumber? = nil,
    splitIdealHorizontal: NSNumber? = nil,
    splitMaxHorizontal: NSNumber? = nil,
    splitMinVertical: NSNumber? = nil,
    splitIdealVertical: NSNumber? = nil,
    splitMaxVertical: NSNumber? = nil,
    splitMinWidth: NSNumber? = nil,
    splitIdealWidth: NSNumber? = nil,
    splitMaxWidth: NSNumber? = nil,
    splitMinHeight: NSNumber? = nil,
    splitIdealHeight: NSNumber? = nil,
    splitMaxHeight: NSNumber? = nil,
    splitFixedHorizontal: NSNumber? = nil,
    splitFixedVertical: NSNumber? = nil,
    overlayEdge: String? = nil
  ) {
    self.splitRatio = splitRatio
    self.splitMinHorizontal = splitMinHorizontal
    self.splitIdealHorizontal = splitIdealHorizontal
    self.splitMaxHorizontal = splitMaxHorizontal
    self.splitMinVertical = splitMinVertical
    self.splitIdealVertical = splitIdealVertical
    self.splitMaxVertical = splitMaxVertical
    self.splitMinWidth = splitMinWidth
    self.splitIdealWidth = splitIdealWidth
    self.splitMaxWidth = splitMaxWidth
    self.splitMinHeight = splitMinHeight
    self.splitIdealHeight = splitIdealHeight
    self.splitMaxHeight = splitMaxHeight
    self.splitFixedHorizontal = splitFixedHorizontal
    self.splitFixedVertical = splitFixedVertical
    self.overlayEdge = overlayEdge
    super.init()
  }
}

@objcMembers
public final class OneNativeArrangementItem: NSObject {
  public let placement: String
  public let view: UIView
  public let onLayout: (CGRect) -> Void
  public var modifiers: OneNativeArrangementModifiers

  public init(placement: String, view: UIView, onLayout: @escaping (CGRect) -> Void, modifiers: OneNativeArrangementModifiers) {
    self.placement = placement
    self.view = view
    self.onLayout = onLayout
    self.modifiers = modifiers
    super.init()
  }
}

private final class ArrangementModel: ObservableObject {
  @Published var primary: OneNativeArrangementItem?
  @Published var secondary: OneNativeArrangementItem?
  @Published var style: String = "automatic"
  @Published var splitAxes: String = "both"
  @Published var overlayAxes: String = "both"
  @Published var modifiers = OneNativeArrangementModifiers()
  @Published var swiftStyle = OneNativeStyle()
  var active = false
  var onSDKEvent: ((String, String) -> Void)?

  func emitSDKEvent(_ name: String, _ value: String) {
    if active { onSDKEvent?(name, value) }
  }
}

@objcMembers
public final class OneNativeArrangementView: UIView {
  public var onSDKEvent: ((String, String) -> Void)?
  private var model = ArrangementModel()
  private var controller: OneNativeHostingController<ArrangementContent>?

  public override init(frame: CGRect) {
    super.init(frame: frame)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public func setPanes(primary: OneNativeArrangementItem?, secondary: OneNativeArrangementItem?) {
    model.primary = primary
    model.secondary = secondary
  }

  public func configure(
    style: String,
    splitAxes: String,
    overlayAxes: String,
    splitRatio: CGFloat,
    splitMinHorizontal: CGFloat,
    splitIdealHorizontal: CGFloat,
    splitMaxHorizontal: CGFloat,
    splitMinVertical: CGFloat,
    splitIdealVertical: CGFloat,
    splitMaxVertical: CGFloat,
    splitMinWidth: CGFloat,
    splitIdealWidth: CGFloat,
    splitMaxWidth: CGFloat,
    splitMinHeight: CGFloat,
    splitIdealHeight: CGFloat,
    splitMaxHeight: CGFloat,
    splitFixedHorizontal: Bool,
    splitFixedVertical: Bool,
    overlayEdge: String
  ) {
    if model.style != style { model.style = style }
    if model.splitAxes != splitAxes { model.splitAxes = splitAxes }
    if model.overlayAxes != overlayAxes { model.overlayAxes = overlayAxes }

    let mods = OneNativeArrangementModifiers(
      splitRatio: splitRatio >= 0 ? NSNumber(value: Double(splitRatio)) : nil,
      splitMinHorizontal: splitMinHorizontal >= 0 ? NSNumber(value: Double(splitMinHorizontal)) : nil,
      splitIdealHorizontal: splitIdealHorizontal >= 0 ? NSNumber(value: Double(splitIdealHorizontal)) : nil,
      splitMaxHorizontal: splitMaxHorizontal >= 0 ? NSNumber(value: Double(splitMaxHorizontal)) : nil,
      splitMinVertical: splitMinVertical >= 0 ? NSNumber(value: Double(splitMinVertical)) : nil,
      splitIdealVertical: splitIdealVertical >= 0 ? NSNumber(value: Double(splitIdealVertical)) : nil,
      splitMaxVertical: splitMaxVertical >= 0 ? NSNumber(value: Double(splitMaxVertical)) : nil,
      splitMinWidth: splitMinWidth >= 0 ? NSNumber(value: Double(splitMinWidth)) : nil,
      splitIdealWidth: splitIdealWidth >= 0 ? NSNumber(value: Double(splitIdealWidth)) : nil,
      splitMaxWidth: splitMaxWidth >= 0 ? NSNumber(value: Double(splitMaxWidth)) : nil,
      splitMinHeight: splitMinHeight >= 0 ? NSNumber(value: Double(splitMinHeight)) : nil,
      splitIdealHeight: splitIdealHeight >= 0 ? NSNumber(value: Double(splitIdealHeight)) : nil,
      splitMaxHeight: splitMaxHeight >= 0 ? NSNumber(value: Double(splitMaxHeight)) : nil,
      splitFixedHorizontal: splitFixedHorizontal ? NSNumber(value: true) : nil,
      splitFixedVertical: splitFixedVertical ? NSNumber(value: true) : nil,
      overlayEdge: !overlayEdge.isEmpty ? overlayEdge : nil
    )
    model.modifiers = mods
  }

  public func configureStyle(_ style: [String: Any]) {
    let next = OneNativeStyle(dictionary: style)
    if model.swiftStyle != next { model.swiftStyle = next }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil { detachController() }
    else { attachController() }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    attachController()
    controller?.view.frame = bounds
  }

  private func attachController() {
    guard window != nil else { return }
    if controller == nil {
      model.onSDKEvent = { [weak self] name, value in self?.onSDKEvent?(name, value) }
      controller = OneNativeHostingController(rootView: ArrangementContent(model: model, host: self))
    }
    controller?.attach(to: self)
    model.active = controller?.isAttached == true
  }

  private func detachController() {
    model.active = false
    controller?.detach()
  }

  public func reset() {
    model.active = false
    model.onSDKEvent = nil
    detachController()
    controller = nil
    model = ArrangementModel()
  }
}

private struct ArrangementContent: View {
  @ObservedObject var model: ArrangementModel
  weak var host: OneNativeArrangementView?

  var body: some View {
    Group {
      #if ONE_IOS_27_1_SDK
      if #available(iOS 27.1, *) {
        ArrangementView(
          primary: {
            if let item = model.primary {
              OneNativeSlot(content: item.view, mode: .fill, layoutHost: host, onLayout: item.onLayout)
                .oneNativeArrangementModifiers(item.modifiers)
            } else {
              Color.clear
            }
          },
          secondary: {
            if let item = model.secondary {
              OneNativeSlot(content: item.view, mode: .fill, layoutHost: host, onLayout: item.onLayout)
                .oneNativeArrangementModifiers(item.modifiers)
            } else {
              Color.clear
            }
          }
        )
        .oneNativeArrangementStyle(model.style, splitAxes: model.splitAxes, overlayAxes: model.overlayAxes)
        .oneNativeArrangementModifiers(model.modifiers)
      } else {
        panes
      }
      #else
      panes
      #endif
    }
    .oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)
  }

  // before iOS 27.1 there is no ArrangementView: the panes sit side by side.
  private var panes: some View {
    HStack(spacing: 0) {
      if let primary = model.primary {
        OneNativeSlot(content: primary.view, mode: .fill, layoutHost: host, onLayout: primary.onLayout)
      }
      if let secondary = model.secondary {
        OneNativeSlot(content: secondary.view, mode: .fill, layoutHost: host, onLayout: secondary.onLayout)
      }
    }
  }
}

#if ONE_IOS_27_1_SDK

@available(iOS 27.1, *)
extension View {
  @ViewBuilder
  func oneNativeArrangementStyle(_ style: String, splitAxes: String, overlayAxes: String) -> some View {
    switch style {
    case "split":
      let axisSet: Axis.Set = splitAxes == "horizontal" ? [.horizontal] : splitAxes == "vertical" ? [.vertical] : [.horizontal, .vertical]
      self.arrangementViewStyle(.split.axes(axisSet))
    case "overlay":
      let axisSet: Axis.Set = overlayAxes == "horizontal" ? [.horizontal] : overlayAxes == "vertical" ? [.vertical] : [.horizontal, .vertical]
      self.arrangementViewStyle(.overlay.axes(axisSet))
    default:
      self.arrangementViewStyle(.automatic)
    }
  }

  func oneNativeArrangementModifiers(_ modifiers: OneNativeArrangementModifiers) -> AnyView {
    var view = AnyView(self)
    if let ratio = modifiers.splitRatio {
      view = AnyView(view.splitArrangementLayoutRatio(CGFloat(truncating: ratio)))
    } else if modifiers.splitMinHorizontal != nil || modifiers.splitIdealHorizontal != nil || modifiers.splitMaxHorizontal != nil ||
              modifiers.splitMinVertical != nil || modifiers.splitIdealVertical != nil || modifiers.splitMaxVertical != nil {
      view = AnyView(view.splitArrangementLayoutRatio(
        minHorizontal: modifiers.splitMinHorizontal.map { CGFloat(truncating: $0) },
        idealHorizontal: modifiers.splitIdealHorizontal.map { CGFloat(truncating: $0) },
        maxHorizontal: modifiers.splitMaxHorizontal.map { CGFloat(truncating: $0) },
        minVertical: modifiers.splitMinVertical.map { CGFloat(truncating: $0) },
        idealVertical: modifiers.splitIdealVertical.map { CGFloat(truncating: $0) },
        maxVertical: modifiers.splitMaxVertical.map { CGFloat(truncating: $0) }
      ))
    }
    if modifiers.splitMinWidth != nil || modifiers.splitIdealWidth != nil || modifiers.splitMaxWidth != nil ||
       modifiers.splitMinHeight != nil || modifiers.splitIdealHeight != nil || modifiers.splitMaxHeight != nil {
      view = AnyView(view.splitArrangementLayoutSize(
        minWidth: modifiers.splitMinWidth.map { CGFloat(truncating: $0) },
        idealWidth: modifiers.splitIdealWidth.map { CGFloat(truncating: $0) },
        maxWidth: modifiers.splitMaxWidth.map { CGFloat(truncating: $0) },
        minHeight: modifiers.splitMinHeight.map { CGFloat(truncating: $0) },
        idealHeight: modifiers.splitIdealHeight.map { CGFloat(truncating: $0) },
        maxHeight: modifiers.splitMaxHeight.map { CGFloat(truncating: $0) }
      ))
    }
    if let h = modifiers.splitFixedHorizontal, let v = modifiers.splitFixedVertical {
      view = AnyView(view.splitArrangementFixedLayoutSize(horizontal: h.boolValue, vertical: v.boolValue))
    } else if let h = modifiers.splitFixedHorizontal {
      view = AnyView(view.splitArrangementFixedLayoutSize(horizontal: h.boolValue))
    } else if let v = modifiers.splitFixedVertical {
      view = AnyView(view.splitArrangementFixedLayoutSize(vertical: v.boolValue))
    }
    if let edge = modifiers.overlayEdge {
      if edge == "top" {
        view = AnyView(view.overlayArrangementEdge(.top))
      } else if edge == "bottom" {
        view = AnyView(view.overlayArrangementEdge(.bottom))
      }
    }
    return view
  }
}
#endif
