// adapted from expo-router (MIT license) - https://github.com/expo/expo
// the zoom sources the router's ZoomTransitionEnabler finds by id. it stays free of
// react so a swiftui view registers itself the same way a ZoomTransitionSource does.
import SwiftUI
import UIKit

// MARK: - singleton manager for zoom transition repositories

class OneZoomManager {
  static let shared = OneZoomManager()
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
      NSLog("[one] ZoomSource with identifier %@ is already registered.", identifier)
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

  // a recycled list cell can register the id again before the old one leaves.
  func unregisterSource(identifier: String, view: UIView) {
    lock.lock()
    defer { lock.unlock() }
    if sources[identifier]?.view === view { sources.removeValue(forKey: identifier) }
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

// MARK: - swiftui sources

// uikit zooms from a view, so a swiftui matchedTransitionSource also stands as the
// router's zoom source of its id through an empty view laid behind it.
final class OneZoomHiddenSources: ObservableObject {
  static let shared = OneZoomHiddenSources()
  @Published private(set) var counts: [String: Int] = [:]

  func hide(_ identifier: String) { counts[identifier, default: 0] += 1 }

  func show(_ identifier: String) {
    guard let count = counts[identifier] else { return }
    counts[identifier] = count > 1 ? count - 1 : nil
  }
}

private struct OneRouterZoomSource: ViewModifier {
  let identifier: String
  @ObservedObject private var hidden = OneZoomHiddenSources.shared

  func body(content: Content) -> some View {
    content
      .opacity(hidden.counts[identifier] == nil ? 1 : 0)
      .background(OneZoomSourceMarker(identifier: identifier))
  }
}

private struct OneZoomSourceMarker: UIViewRepresentable {
  let identifier: String

  final class Coordinator {
    var identifier = ""
  }

  func makeCoordinator() -> Coordinator { Coordinator() }

  func makeUIView(context: Context) -> UIView {
    let view = UIView()
    view.isUserInteractionEnabled = false
    return view
  }

  func updateUIView(_ view: UIView, context: Context) {
    let coordinator = context.coordinator
    guard coordinator.identifier != identifier else { return }
    let repository = OneZoomManager.shared.sourceRepository
    repository.unregisterSource(identifier: coordinator.identifier, view: view)
    coordinator.identifier = identifier
    repository.registerSource(
      identifier: identifier,
      source: SourceInfo(view: view, alignment: nil, animateAspectRatioChange: false))
  }

  static func dismantleUIView(_ view: UIView, coordinator: Coordinator) {
    OneZoomManager.shared.sourceRepository.unregisterSource(
      identifier: coordinator.identifier, view: view)
  }
}

extension View {
  func oneNativeRouterZoomSource(_ identifier: String) -> some View {
    modifier(OneRouterZoomSource(identifier: identifier))
  }
}
