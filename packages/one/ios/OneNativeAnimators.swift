import SwiftUI
import UIKit

// SwiftUI's PhaseAnimator and KeyframeAnimator, driven by SwiftUI itself. React
// evaluates the content closure ahead of time: once per phase, or at the initial
// keyframe value plus one unit step per field. Each animated child carries the
// resulting styles in its swiftStyle; the animator publishes its current phase
// or keyframe value through the environment, and the child resolves its style
// from that inside SwiftUI's own animation transaction or keyframe timeline.

public enum OneNativeAnimatorState: Equatable {
  case phase(Int)
  case keyframe([Double])
}

private struct OneNativeAnimatorsKey: EnvironmentKey {
  static let defaultValue: [Int32: OneNativeAnimatorState] = [:]
}

extension EnvironmentValues {
  var oneNativeAnimators: [Int32: OneNativeAnimatorState] {
    get { self[OneNativeAnimatorsKey.self] }
    set { self[OneNativeAnimatorsKey.self] = newValue }
  }
}

private struct OneNativeAnimatorPublisher<Content: View>: View {
  @Environment(\.oneNativeAnimators) private var animators
  let id: Int32
  let state: OneNativeAnimatorState
  let content: Content

  var body: some View {
    var next = animators
    next[id] = state
    return content.environment(\.oneNativeAnimators, next)
  }
}

private func oneNativeColor(_ value: Any) -> UIColor? {
  // processColor gives iOS colors as 0xAARRGGBB.
  guard let number = value as? NSNumber else { return nil }
  let argb = number.uint32Value
  return UIColor(
    red: CGFloat((argb >> 16) & 0xff) / 255, green: CGFloat((argb >> 8) & 0xff) / 255,
    blue: CGFloat(argb & 0xff) / 255, alpha: CGFloat((argb >> 24) & 0xff) / 255)
}

private let oneNativeColorFields: Set<String> = [
  "foregroundStyle", "tint", "background", "borderColor", "glassEffectTint",
]

// one affine function of the keyframe value: base plus one coefficient per field.
private struct OneNativeKeyframeToken: Decodable {
  let base: Double
  let coefficients: [Double]

  func value(_ fields: [Double]) -> Double {
    var result = base
    for (index, coefficient) in coefficients.enumerated() where coefficient != 0 {
      result += coefficient * fields[index]
    }
    return result
  }
}

private struct OneNativeAnimatorPayload: Decodable {
  let id: Int32
  let kind: String
  // phase: the style keys that vary, then each phase's values for them.
  let varying: [String]?
  let phases: [[String: OneNativeJSONValue]]?
  // keyframe: style fields bound to a token, and the sdk modifier template whose
  // @@n@@ markers are replaced by token n.
  let fields: [String: Int]?
  let sdkModifiers: String?
  let tokens: [OneNativeKeyframeToken]?
}

private enum OneNativeJSONValue: Decodable {
  case number(Double)
  case string(String)
  case bool(Bool)

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if let value = try? container.decode(Bool.self) {
      self = .bool(value)
    } else if let value = try? container.decode(Double.self) {
      self = .number(value)
    } else {
      self = .string(try container.decode(String.self))
    }
  }

  func dictionaryValue(for key: String) -> Any {
    switch self {
    case .number(let value):
      if oneNativeColorFields.contains(key) {
        guard let color = oneNativeColor(NSNumber(value: value)) else {
          preconditionFailure("invalid animated color \(key)")
        }
        return color
      }
      return value
    case .string(let value): return value
    case .bool(let value): return value
    }
  }
}

private func oneNativeKeyframeNumber(_ value: Double) -> String {
  if value.rounded() == value, abs(value) < 1e15 { return String(Int64(value)) }
  return String(value)
}

public final class OneNativeAnimatorStyle: Equatable {
  let id: Int32
  private let json: String
  private let base: [String: Any]
  private let payload: OneNativeAnimatorPayload
  private lazy var phaseStyles: [OneNativeStyle] = (payload.phases ?? []).map { values in
    var dictionary = base
    for key in payload.varying ?? [] { dictionary.removeValue(forKey: key) }
    for (key, value) in values { dictionary[key] = value.dictionaryValue(for: key) }
    return OneNativeStyle(dictionary: dictionary)
  }

  // base is the style dictionary without this payload's sdk modifier pair.
  init(json: String, base: [String: Any]) {
    guard let data = json.data(using: .utf8),
      let payload = try? JSONDecoder().decode(OneNativeAnimatorPayload.self, from: data)
    else { preconditionFailure("invalid animator style") }
    switch payload.kind {
    case "phase":
      guard let phases = payload.phases, !phases.isEmpty, let varying = payload.varying,
        phases.allSatisfy({ Set($0.keys).isSubset(of: varying) })
      else { preconditionFailure("invalid phase animator style") }
    case "keyframe":
      guard let tokens = payload.tokens, let fields = payload.fields,
        fields.values.allSatisfy({ $0 >= 0 && $0 < tokens.count })
      else { preconditionFailure("invalid keyframe animator style") }
    default: preconditionFailure("invalid animator style kind \(payload.kind)")
    }
    self.id = payload.id
    self.json = json
    self.base = base
    self.payload = payload
  }

  public static func == (a: OneNativeAnimatorStyle, b: OneNativeAnimatorStyle) -> Bool {
    a.json == b.json && NSDictionary(dictionary: a.base).isEqual(to: b.base)
  }

  func resolve(_ state: OneNativeAnimatorState?) -> OneNativeStyle {
    switch (payload.kind, state) {
    case ("phase", .phase(let phase)?):
      precondition(phase >= 0 && phase < phaseStyles.count, "animated style has no phase \(phase)")
      return phaseStyles[phase]
    case ("keyframe", .keyframe(let fields)?):
      let tokens = payload.tokens!
      let values = tokens.map { $0.value(fields) }
      var dictionary = base
      for (key, index) in payload.fields! { dictionary[key] = values[index] }
      if var template = payload.sdkModifiers {
        for (index, value) in values.enumerated().reversed() {
          template = template.replacingOccurrences(of: "@@\(index)@@", with: oneNativeKeyframeNumber(value))
        }
        dictionary["sdkModifiers"] = template
      }
      return OneNativeStyle(dictionary: dictionary)
    default:
      preconditionFailure("an animated swiftStyle rendered outside its \(payload.kind) animator")
    }
  }
}

struct OneNativeAnimatedStyle: View {
  @Environment(\.oneNativeAnimators) private var animators
  let content: AnyView
  let animator: OneNativeAnimatorStyle
  let emit: (String, String) -> Void

  var body: some View {
    content.oneNativeStyle(animator.resolve(animators[animator.id]), emit: emit)
  }
}

// MARK: PhaseAnimator

final class OneNativePhaseAnimatorModel: ObservableObject {
  @Published var id: Int32 = 0
  @Published var animations: [String?] = []
  @Published var hasTrigger = false
  @Published var trigger: Int32 = 0
}

private struct PhaseAnimatorContent: View {
  @ObservedObject var model: OneNativePhaseAnimatorModel
  @ObservedObject var children: OneNativeChildren

  private func content(_ phase: Int) -> some View {
    OneNativeAnimatorPublisher(
      id: model.id, state: .phase(phase),
      content: Group { ForEach(children.items) { child in child.content } })
  }

  private func animation(_ phase: Int) -> Animation? {
    model.animations[phase].map(oneNativeAnimation(named:))
  }

  var body: some View {
    let phases = Array(model.animations.indices)
    if phases.isEmpty {
      EmptyView()
    } else if model.hasTrigger {
      PhaseAnimator(phases, trigger: model.trigger, content: content, animation: animation)
    } else {
      PhaseAnimator(phases, content: content, animation: animation)
    }
  }
}

@objcMembers
public final class OneNativePhaseAnimatorView: OneNativeContainerView {
  private let model: OneNativePhaseAnimatorModel

  public init() {
    let model = OneNativePhaseAnimatorModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(PhaseAnimatorContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  // animations is a JSON array with one SDK animation name or null per phase.
  public func configure(animatorId: Int32, animations: String, hasTrigger: Bool, trigger: Int32) {
    guard let data = animations.data(using: .utf8),
      let decoded = try? JSONDecoder().decode([String?].self, from: data), !decoded.isEmpty
    else { preconditionFailure("invalid PhaseAnimator animations") }
    if model.id != animatorId { model.id = animatorId }
    if model.animations != decoded { model.animations = decoded }
    if model.hasTrigger != hasTrigger { model.hasTrigger = hasTrigger }
    if model.trigger != trigger { model.trigger = trigger }
  }
}

// MARK: KeyframeAnimator

// KeyframesBuilder has no loop over tracks, so the animated value has a fixed
// number of fields, each with its own static track.
let oneNativeKeyframeFieldLimit = 8

struct OneNativeKeyframeValue: Equatable {
  var fields: [Double]
  subscript(index: Int) -> Double {
    get { fields[index] }
    set { fields[index] = newValue }
  }
}

struct OneNativeKeyframeSpring: Decodable {
  let kind: String
  let duration: Double?
  let bounce: Double?
  let mass: Double?
  let stiffness: Double?
  let damping: Double?
  let allowOverDamping: Bool?
  let response: Double?
  let dampingRatio: Double?
  let settlingDuration: Double?
  let epsilon: Double?

  var spring: Spring {
    switch kind {
    case "smooth": return .smooth
    case "snappy": return .snappy
    case "bouncy": return .bouncy
    case "duration": return Spring(duration: duration ?? 0.5, bounce: bounce ?? 0)
    case "physical":
      return Spring(
        mass: mass ?? 1, stiffness: stiffness!, damping: damping!,
        allowOverDamping: allowOverDamping ?? false)
    case "response": return Spring(response: response!, dampingRatio: dampingRatio!)
    case "settling":
      return Spring(settlingDuration: settlingDuration!, dampingRatio: dampingRatio!, epsilon: epsilon ?? 0.001)
    default: preconditionFailure("invalid SpringKeyframe spring \(kind)")
    }
  }
}

struct OneNativeKeyframeCurve: Decodable {
  let name: String?
  let startControlPoint: [Double]?
  let endControlPoint: [Double]?

  var curve: UnitCurve {
    if let start = startControlPoint, let end = endControlPoint {
      return .bezier(
        startControlPoint: UnitPoint(x: start[0], y: start[1]),
        endControlPoint: UnitPoint(x: end[0], y: end[1]))
    }
    switch name {
    case "linear": return .linear
    case "easeIn": return .easeIn
    case "easeOut": return .easeOut
    case "easeInOut": return .easeInOut
    case "circularEaseIn": return .circularEaseIn
    case "circularEaseOut": return .circularEaseOut
    case "circularEaseInOut": return .circularEaseInOut
    default: preconditionFailure("invalid LinearKeyframe timingCurve \(name ?? "nil")")
    }
  }
}

struct OneNativeKeyframe: Decodable {
  let kind: String
  let to: Double
  let duration: Double?
  let timingCurve: OneNativeKeyframeCurve?
  let spring: OneNativeKeyframeSpring?
  let startVelocity: Double?
  let endVelocity: Double?

  var valid: Bool {
    switch kind {
    case "linear", "cubic": return duration.map { $0.isFinite && $0 >= 0 } ?? false
    case "spring": return duration.map { $0.isFinite && $0 >= 0 } ?? true
    case "move": return true
    default: return false
    }
  }
}

struct OneNativeKeyframeTrack: Decodable {
  let field: Int
  let keyframes: [OneNativeKeyframe]
}

private struct OneNativeKeyframeFrames: KeyframeTrackContent {
  typealias Value = Double
  let keyframes: [OneNativeKeyframe]

  var body: some KeyframeTrackContent<Double> {
    for frame in keyframes {
      switch frame.kind {
      case "linear":
        LinearKeyframe(frame.to, duration: frame.duration!, timingCurve: frame.timingCurve?.curve ?? .linear)
      case "spring":
        SpringKeyframe(
          frame.to, duration: frame.duration, spring: frame.spring?.spring ?? Spring(),
          startVelocity: frame.startVelocity)
      case "cubic":
        CubicKeyframe(
          frame.to, duration: frame.duration!, startVelocity: frame.startVelocity,
          endVelocity: frame.endVelocity)
      default:
        // configure admits only the four SDK keyframe kinds.
        MoveKeyframe(frame.to)
      }
    }
  }
}

final class OneNativeKeyframeAnimatorModel: ObservableObject {
  @Published var id: Int32 = 0
  @Published var initialValue: [Double] = []
  @Published var tracks: [[OneNativeKeyframe]] = []
  var tracksJSON = ""
  @Published var repeating = true
  @Published var hasTrigger = false
  @Published var trigger: Int32 = 0
}

private struct KeyframeAnimatorContent: View {
  @ObservedObject var model: OneNativeKeyframeAnimatorModel
  @ObservedObject var children: OneNativeChildren

  private var initialValue: OneNativeKeyframeValue {
    var fields = model.initialValue
    fields.append(contentsOf: repeatElement(0, count: oneNativeKeyframeFieldLimit - fields.count))
    return OneNativeKeyframeValue(fields: fields)
  }

  private func content(_ value: OneNativeKeyframeValue) -> some View {
    OneNativeAnimatorPublisher(
      id: model.id, state: .keyframe(Array(value.fields.prefix(model.initialValue.count))),
      content: Group { ForEach(children.items) { child in child.content } })
  }

  private func frames(_ field: Int) -> OneNativeKeyframeFrames {
    OneNativeKeyframeFrames(keyframes: field < model.tracks.count ? model.tracks[field] : [])
  }

  @KeyframesBuilder<OneNativeKeyframeValue>
  private func keyframes(_: OneNativeKeyframeValue) -> some Keyframes<OneNativeKeyframeValue> {
    KeyframeTrack(\OneNativeKeyframeValue.[0]) { frames(0) }
    KeyframeTrack(\OneNativeKeyframeValue.[1]) { frames(1) }
    KeyframeTrack(\OneNativeKeyframeValue.[2]) { frames(2) }
    KeyframeTrack(\OneNativeKeyframeValue.[3]) { frames(3) }
    KeyframeTrack(\OneNativeKeyframeValue.[4]) { frames(4) }
    KeyframeTrack(\OneNativeKeyframeValue.[5]) { frames(5) }
    KeyframeTrack(\OneNativeKeyframeValue.[6]) { frames(6) }
    KeyframeTrack(\OneNativeKeyframeValue.[7]) { frames(7) }
  }

  var body: some View {
    if model.initialValue.isEmpty {
      EmptyView()
    } else if model.hasTrigger {
      KeyframeAnimator(initialValue: initialValue, trigger: model.trigger, content: content, keyframes: keyframes)
    } else {
      KeyframeAnimator(initialValue: initialValue, repeating: model.repeating, content: content, keyframes: keyframes)
    }
  }
}

@objcMembers
public final class OneNativeKeyframeAnimatorView: OneNativeContainerView {
  private let model: OneNativeKeyframeAnimatorModel

  public init() {
    let model = OneNativeKeyframeAnimatorModel()
    self.model = model
    super.init(wrap: { children, _ in
      AnyView(KeyframeAnimatorContent(model: model, children: children))
    })
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  // initialValue is a JSON array of field values; tracks a JSON array of
  // { field, keyframes } with at most one track per field.
  public func configure(
    animatorId: Int32, initialValue: String, tracks: String, repeating: Bool, hasTrigger: Bool,
    trigger: Int32
  ) {
    guard let valueData = initialValue.data(using: .utf8),
      let fields = try? JSONDecoder().decode([Double].self, from: valueData),
      !fields.isEmpty, fields.count <= oneNativeKeyframeFieldLimit,
      let trackData = tracks.data(using: .utf8),
      let decoded = try? JSONDecoder().decode([OneNativeKeyframeTrack].self, from: trackData),
      decoded.allSatisfy({ $0.field >= 0 && $0.field < fields.count }),
      Set(decoded.map(\.field)).count == decoded.count,
      decoded.allSatisfy({ $0.keyframes.allSatisfy(\.valid) })
    else { preconditionFailure("invalid KeyframeAnimator configuration") }
    var byField = Array(repeating: [OneNativeKeyframe](), count: fields.count)
    for track in decoded { byField[track.field] = track.keyframes }
    if model.id != animatorId { model.id = animatorId }
    if model.initialValue != fields { model.initialValue = fields }
    if model.tracksJSON != tracks {
      model.tracksJSON = tracks
      model.tracks = byField
    }
    if model.repeating != repeating { model.repeating = repeating }
    if model.hasTrigger != hasTrigger { model.hasTrigger = hasTrigger }
    if model.trigger != trigger { model.trigger = trigger }
  }
}
