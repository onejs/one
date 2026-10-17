import SwiftUI
import UIKit

// SwiftUI's TimelineView. native owns the schedule: SwiftUI decides when each entry
// is due and with which cadence, and every entry's context date and cadence reach
// React, which runs the content closure with them. the TimelineView hosts the
// composed content, so entries cost one event and no layout beyond the content's.
private struct TimelineViewTick: Equatable {
  let time: Double
  let cadence: String

  init(_ context: TimelineViewDefaultContext) {
    time = context.date.timeIntervalSince1970 * 1000
    switch context.cadence {
    case .live: cadence = "live"
    case .seconds: cadence = "seconds"
    case .minutes: cadence = "minutes"
    @unknown default: preconditionFailure("unknown TimelineView cadence")
    }
  }
}

private enum TimelineViewSchedule: Equatable {
  case everyMinute
  case periodic(from: Date, by: TimeInterval)
  case explicit([Date])

  init(_ kind: String, startDate: Double, interval: Double, dates: String) {
    switch kind {
    case "everyMinute": self = .everyMinute
    case "periodic":
      self = .periodic(from: Date(timeIntervalSince1970: startDate / 1000), by: interval)
    case "explicit":
      guard let data = dates.data(using: .utf8),
        let times = try? JSONDecoder().decode([Double].self, from: data)
      else { preconditionFailure("invalid Swift.TimelineView dates: \(dates)") }
      self = .explicit(times.map { Date(timeIntervalSince1970: $0 / 1000) })
    default: preconditionFailure("invalid Swift.TimelineView schedule: \(kind)")
    }
  }
}

private final class TimelineViewModel: ObservableObject {
  @Published var schedule = TimelineViewSchedule.everyMinute
  var active = false
  var latest: TimelineViewTick?
  var onTick: ((TimelineViewTick) -> Void)?
  var onHeight: ((CGFloat) -> Void)?

  func emit(_ tick: TimelineViewTick) {
    latest = tick
    if active { onTick?(tick) }
  }

  func setActive(_ active: Bool) {
    self.active = active
    if active, let latest { onTick?(latest) }
  }
}

private struct TimelineViewContent: View {
  @ObservedObject var model: TimelineViewModel
  @ObservedObject var children: OneNativeChildren
  @ObservedObject var style: OneNativeContainerStyle
  let standalone: Bool
  @ObservedObject var bridge: OneNativeSchemeBridge

  var body: some View {
    timeline
      .frame(maxWidth: standalone ? .infinity : nil, alignment: .leading)
      .oneNativeContainerStyle(style)
      .oneNativeMeasured(standalone, model.onHeight)
      .oneNativeScheme(standalone, bridge.scheme)
  }

  @ViewBuilder private var timeline: some View {
    switch model.schedule {
    case .everyMinute:
      TimelineView(.everyMinute) { context in entry(context) }
    case .periodic(let from, let interval):
      TimelineView(.periodic(from: from, by: interval)) { context in entry(context) }
    case .explicit(let dates):
      TimelineView(.explicit(dates)) { context in entry(context) }
    }
  }

  private func entry(_ context: TimelineViewDefaultContext) -> some View {
    Group {
      ForEach(children.items) { child in child.content }
    }
    .onChange(of: TimelineViewTick(context), initial: true) { _, tick in model.emit(tick) }
  }
}

@objcMembers
public final class OneNativeTimelineViewView: OneNativeContainerView {
  public var onTick: ((Double, String) -> Void)?
  public var onMeasure: ((CGFloat) -> Void)?
  private let model: TimelineViewModel
  private let bridge: OneNativeSchemeBridge
  private var traitRegistration: NSObjectProtocol?

  public init() {
    let model = TimelineViewModel()
    let bridge = OneNativeSchemeBridge()
    self.model = model
    self.bridge = bridge
    super.init(styled: { children, style, standalone in
      AnyView(
        TimelineViewContent(
          model: model, children: children, style: style, standalone: standalone, bridge: bridge))
    })
    model.onTick = { [weak self] tick in self?.onTick?(tick.time, tick.cadence) }
    model.onHeight = { [weak self] height in self?.onMeasure?(height) }
    traitRegistration = registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      [weak bridge] (view: OneNativeTimelineViewView, _: UITraitCollection) in
      bridge?.sync(view.traitCollection)
    }
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  public override func didMoveToWindow() {
    bridge.sync(traitCollection)
    super.didMoveToWindow()
  }

  public func configure(schedule: String, startDate: Double, interval: Double, dates: String) {
    let next = TimelineViewSchedule(schedule, startDate: startDate, interval: interval, dates: dates)
    if model.schedule != next { model.schedule = next }
  }

  public override func setActive(_ active: Bool) { model.setActive(active) }

  public override func reset() {
    model.latest = nil
    super.reset()
  }
}
