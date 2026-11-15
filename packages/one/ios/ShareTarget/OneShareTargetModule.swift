import Foundation

public typealias OneShareTargetResolve = (Any?) -> Void
public typealias OneShareTargetReject = (String?, String?, Error?) -> Void

@objc(OneShareTargetModule)
public final class OneShareTargetModule: NSObject {
  @objc public static func requiresMainQueueSetup() -> Bool {
    false
  }

  private static func serializeItem(_ item: OneSharedItem) -> [String: Any] {
    switch item {
    case .text(let value):
      return [
        "kind": "text",
        "text": value,
      ]
    case .url(let value):
      return [
        "kind": "url",
        "url": value.absoluteString,
      ]
    case .file(let value):
      return [
        "kind": "file",
        "file": [
          "url": value.url.absoluteString,
          "name": value.name,
          "mimeType": value.mimeType,
          "byteCount": value.byteCount,
        ],
      ]
    }
  }

  private static func serializeDraft(_ draft: OneShareTargetDraft) -> [String: Any] {
    [
      "id": draft.id,
      "destinationId": draft.destinationId ?? NSNull(),
      "text": draft.text,
      "createdAt": draft.createdAt.timeIntervalSince1970 * 1000,
      "pendingDelivery": draft.pendingDelivery.map { NSNumber(value: $0) } ?? NSNull(),
      "items": draft.items.map(serializeItem),
    ]
  }

  @objc(getDrafts:resolve:reject:)
  public func getDrafts(
    _ appGroup: String,
    resolve: @escaping OneShareTargetResolve,
    reject: @escaping OneShareTargetReject
  ) {
    Task {
      do {
        let store = try OneShareTargetDraftStore(appGroupIdentifier: appGroup)
        let ids = await store.allSubmissionIds().sorted()
        var drafts: [[String: Any]] = []
        for id in ids {
          if let draft = try await store.load(submissionId: id) {
            drafts.append(Self.serializeDraft(draft))
          }
        }
        resolve(drafts)
      } catch {
        reject("E_SHARE_TARGET_READ", error.localizedDescription, error)
      }
    }
  }

  @objc(discardDraft:submissionId:resolve:reject:)
  public func discardDraft(
    _ appGroup: String,
    submissionId: String,
    resolve: @escaping OneShareTargetResolve,
    reject: @escaping OneShareTargetReject
  ) {
    Task {
      do {
        let store = try OneShareTargetDraftStore(appGroupIdentifier: appGroup)
        try await store.discard(submissionId: submissionId)
        resolve(nil)
      } catch {
        reject("E_SHARE_TARGET_DISCARD", error.localizedDescription, error)
      }
    }
  }
}
