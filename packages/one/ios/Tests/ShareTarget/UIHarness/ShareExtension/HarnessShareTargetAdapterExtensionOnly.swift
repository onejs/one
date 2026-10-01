// The actual OneShareTargetAdapter conformance; extension-only (see
// Shared/HarnessShareTargetAdapter.swift for why).
import Foundation

final class HarnessShareTargetAdapter: OneShareTargetAdapter {
  init() {}

  func destinations() async throws -> [OneShareDestination] {
    try await HarnessControl.waitIfHeld("destinations")
    if HarnessControl.controlledFlag("destinationsShouldFail") {
      throw HarnessAdapterError.destinationsUnavailable
    }
    return [
      OneShareDestination(id: "team", title: "Team Machine", subtitle: "Updated 2m ago"),
      OneShareDestination(id: "personal", title: "Personal", subtitle: "3 unread"),
    ]
  }

  func send(submission: OneShareSubmission) async throws {
    try HarnessControl.record("submission-" + UUID().uuidString, data: JSONEncoder().encode(submission))
    try await HarnessControl.waitIfHeld("send")
    if HarnessControl.controlledFlag("sendShouldFail") {
      throw HarnessAdapterError.sendFailed
    }
    try HarnessControl.record("accepted", data: JSONEncoder().encode(submission))
  }
}

enum HarnessAdapterError: Error, LocalizedError {
  case destinationsUnavailable
  case sendFailed

  var errorDescription: String? {
    switch self {
    case .destinationsUnavailable: return "Destinations are unavailable right now."
    case .sendFailed: return "The harness was told to simulate a send failure."
    }
  }
}
