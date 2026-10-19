import CoreGraphics
import XCTest

@testable import OneMenuPreviewSession

// framework stand-ins; the session under test is the real symlinked source.
final class StubContent: OneNativeMenuPreviewContent {
  var previewHidden = true
  var previewFrame = CGRect.zero
  weak var parent: StubHost?
  func detachFromPreviewParent() {
    parent?.attached.removeAll { $0 === self }
    parent = nil
  }
}

final class StubHost: OneNativeMenuPreviewHost {
  var previewPreferredSize = CGSize.zero
  var attached: [any OneNativeMenuPreviewContent] = []
  func attachPreview(_ content: any OneNativeMenuPreviewContent) {
    (content as? StubContent)?.parent = self
    attached.append(content)
  }
}

final class DeferredAnimator: OneNativeMenuPreviewAnimator {
  var pending: [() -> Void] = []
  func addPreviewCompletion(_ completion: @escaping () -> Void) { pending.append(completion) }
  func finish() { pending.forEach { $0() }; pending = [] }
}

final class MenuPreviewSessionTests: XCTestCase {
  private func session() -> OneNativeMenuPreviewSession<StubContent, StubHost> {
    OneNativeMenuPreviewSession { StubHost() }
  }

  private func mount(
    _ session: OneNativeMenuPreviewSession<StubContent, StubHost>,
    width: Double = 240,
    height: Double = 120
  ) -> StubContent {
    let content = StubContent()
    session.setSize(width: width, height: height)
    session.mount(content) { _ in }
    return content
  }

  func testNormalDismissalDetachesAndHides() {
    let session = session()
    let content = mount(session)
    let host = session.present()!
    XCTAssertFalse(content.previewHidden)
    XCTAssertTrue(host.attached.contains { ($0 as? StubContent) === content })
    let animator = DeferredAnimator()
    session.end(animator: animator)
    animator.finish()
    XCTAssertTrue(content.previewHidden)
    XCTAssertNil(content.parent)
    XCTAssertNil(session.host)
  }

  func testPresentNeedsContentAndPositiveBox() {
    let session = session()
    XCTAssertNil(session.present())
    let content = StubContent()
    session.mount(content) { _ in }
    XCTAssertNil(session.present())
    session.setSize(width: 240, height: 120)
    XCTAssertNotNil(session.present())
  }

  func testEndWithoutAnimatorCleansUpInline() {
    let session = session()
    let content = mount(session)
    session.present()
    session.end(animator: nil)
    XCTAssertTrue(content.previewHidden)
    XCTAssertNil(content.parent)
    XCTAssertNil(session.host)
  }

  func testReplacementWhilePresentedJoinsLiveHost() {
    let session = session()
    let old = mount(session)
    let host = session.present()!
    let new = StubContent()
    session.mount(new) { _ in }
    XCTAssertTrue(old.previewHidden)
    XCTAssertNil(old.parent)
    XCTAssertFalse(new.previewHidden)
    XCTAssertTrue(host.attached.contains { ($0 as? StubContent) === new })
    XCTAssertTrue(session.host === host)
  }

  // p2-1: a recycled host's old dismissal completion must not touch the
  // successor presentation. Fabric recycles the menu view (reset) while an
  // earlier dismissal animation still holds its completion.
  func testResetBeforeDismissalCompletionLeavesSuccessorIntact() {
    let session = session()
    let old = mount(session)
    session.present()
    let animator = DeferredAnimator()
    session.end(animator: animator)
    session.reset()
    let new = mount(session)
    let newHost = session.present()!
    XCTAssertFalse(new.previewHidden)
    animator.finish()
    XCTAssertFalse(new.previewHidden, "old completion hid the recycled successor")
    XCTAssertTrue(new.parent === newHost, "old completion detached the recycled successor")
    XCTAssertTrue(session.host === newHost, "old completion cleared the live host")
    _ = old
  }

  // p2-1 without recycle: dismissing then re-presenting before the old
  // completion must not let it touch the new presentation either.
  func testRapidRepresentSupersedesOldCompletion() {
    let session = session()
    _ = mount(session)
    session.present()
    let animator = DeferredAnimator()
    session.end(animator: animator)
    let new = StubContent()
    session.mount(new) { _ in }
    let newHost = session.present()!
    animator.finish()
    XCTAssertFalse(new.previewHidden, "old completion hid the new presentation")
    XCTAssertTrue(new.parent === newHost, "old completion detached the new presentation")
    XCTAssertTrue(session.host === newHost, "old completion cleared the live host")
  }

  // p2-2: resizing while presented must update the live controller and keep
  // the content visible at the new box.
  func testResizeWhilePresentedUpdatesHostAndKeepsContentVisible() {
    let session = session()
    let content = mount(session)
    let host = session.present()!
    session.setSize(width: 300, height: 180)
    XCTAssertEqual(host.previewPreferredSize, CGSize(width: 300, height: 180))
    XCTAssertEqual(content.previewFrame, CGRect(x: 0, y: 0, width: 300, height: 180))
    XCTAssertFalse(content.previewHidden)
    XCTAssertTrue(content.parent === host)
  }
}
