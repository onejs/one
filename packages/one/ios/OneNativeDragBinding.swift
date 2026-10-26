import SwiftUI

// a drag bound to a native state entry: each change writes the entry's value at
// the start of the drag plus the translation along one axis, clamped to range,
// so views reading the entry follow the finger without JavaScript. on end, snap
// writes the target nearest the predicted end inside its animation.
struct OneNativeDragBinding {
  let state: Int32
  let vertical: Bool
  let range: ClosedRange<Double>?
  let targets: [Double]
  let animation: SwiftUI.Animation?

  init?(_ record: OneNativeSDKRecord) {
    guard let raw = record.fields["bind"] else {
      precondition(record.fields["snap"] == nil, "invalid \(record.context): snap needs bind")
      return nil
    }
    guard let bind = raw as? [String: Any], let id = bind["state"] as? NSNumber, id.int32Value != 0,
      let axis = bind["axis"] as? String, axis == "x" || axis == "y" else {
      preconditionFailure("invalid \(record.context).bind")
    }
    state = id.int32Value
    vertical = axis == "y"
    if let bounds = bind["range"] {
      guard let bounds = bounds as? [NSNumber], bounds.count == 2,
        bounds.allSatisfy({ $0.doubleValue.isFinite }), bounds[0].doubleValue <= bounds[1].doubleValue else {
        preconditionFailure("invalid \(record.context).bind.range")
      }
      range = bounds[0].doubleValue...bounds[1].doubleValue
    } else {
      range = nil
    }
    if let raw = record.fields["snap"] {
      guard let snap = raw as? [String: Any], let targets = snap["targets"] as? [NSNumber], !targets.isEmpty,
        targets.allSatisfy({ $0.doubleValue.isFinite }), let animation = snap["animation"],
        range.map({ range in targets.allSatisfy { range.contains($0.doubleValue) } }) ?? true else {
        preconditionFailure("invalid \(record.context).snap")
      }
      self.targets = targets.map(\.doubleValue)
      self.animation = oneNativeSDKValueAnimation(animation, record.context + ".snap.animation")
    } else {
      targets = []
      animation = nil
    }
  }

  // writes start, the entry's value when this drag began, plus the translation.
  func changed(_ translation: CGSize, from start: Double) {
    OneNativeSyncRegistry.set(state, value: NSNumber(value: clamped(start + along(translation))))
  }

  // the snap target the drag settled on, or nil without snap.
  func ended(predicted: CGSize, from start: Double) -> Double? {
    guard !targets.isEmpty else { return nil }
    let projected = clamped(start + along(predicted))
    let target = targets.min { abs($0 - projected) < abs($1 - projected) }!
    withAnimation(animation) {
      OneNativeSyncRegistry.set(state, value: NSNumber(value: target))
    }
    return target
  }

  private func along(_ size: CGSize) -> Double {
    Double(vertical ? size.height : size.width)
  }

  private func clamped(_ value: Double) -> Double {
    guard let range else { return value }
    return min(max(value, range.lowerBound), range.upperBound)
  }

  func current() -> Double {
    guard let number = OneNativeSyncRegistry.get(state) as? NSNumber, number.doubleValue.isFinite else {
      preconditionFailure("drag bind state \(state) must hold a finite number")
    }
    return number.doubleValue
  }
}

// attaches a drag whose bound start lives in the view's gesture state, so swiftui
// clears it when the drag ends or is cancelled and each view keeps its own.
struct OneNativeDragHost: ViewModifier {
  enum Attachment {
    case gesture
    case highPriorityGesture
    case simultaneousGesture
  }

  // hands the start of the drag in progress to onEnded, which runs after swiftui
  // has reset the gesture state.
  private final class Session {
    var start: Double?
  }

  let attachment: Attachment
  let gesture: SwiftUI.DragGesture
  let binding: OneNativeDragBinding?
  let changed: ((SwiftUI.DragGesture.Value) -> Void)?
  let ended: (SwiftUI.DragGesture.Value, Double?) -> Void
  @GestureState private var start: Double?
  @State private var session = Session()

  @ViewBuilder func body(content: Content) -> some View {
    let drag = gesture.updating($start) { item, start, _ in
      guard let binding else { return }
      if start == nil {
        start = binding.current()
        session.start = start
      }
      binding.changed(item.translation, from: start!)
    }.onChanged { item in
      changed?(item)
    }.onEnded { item in
      let start = session.start
      session.start = nil
      ended(item, binding.flatMap { $0.ended(predicted: item.predictedEndTranslation, from: start ?? $0.current()) })
    }
    switch attachment {
    case .gesture: content.gesture(drag)
    case .highPriorityGesture: content.highPriorityGesture(drag)
    case .simultaneousGesture: content.simultaneousGesture(drag)
    }
  }
}
