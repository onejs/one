import Foundation

public typealias OneShareTargetResolve = (Any?) -> Void
public typealias OneShareTargetReject = (String?, String?, Error?) -> Void

@objc(OneShareTargetModule)
public final class OneShareTargetModule: NSObject {
  @objc public static func requiresMainQueueSetup() -> Bool {
    false
  }

  private func serializeDraft(
    _ draft: OneShareTargetDraft,
    store: OneShareTargetDraftStore
  ) -> [String: Any] {
    let items: [[String: Any]] = draft.items.map { item in
      let resolvedFileUri = (try? store.resolvedAttachmentURL(for: item))?.absoluteString
      return [
        "id": item.id,
        "kind": item.kind.rawValue,
        "typeIdentifier": item.typeIdentifier,
        "mimeType": item.mimeType ?? NSNull(),
        "suggestedName": item.suggestedName ?? NSNull(),
        "text": item.text ?? NSNull(),
        "url": item.urlString ?? NSNull(),
        "fileUri": resolvedFileUri ?? NSNull(),
        "byteSize": item.byteSize.map { NSNumber(value: $0) } ?? NSNull(),
      ]
    }
    return [
      "sessionId": draft.sessionID,
      "createdAt": draft.createdAt * 1000,
      "targetRoute": draft.targetRoute ?? NSNull(),
      "sourceBundleId": draft.sourceBundleIdentifier ?? NSNull(),
      "items": items,
    ]
  }

  @objc(getDrafts:resolve:reject:)
  public func getDrafts(
    _ appGroup: String,
    resolve: @escaping OneShareTargetResolve,
    reject: @escaping OneShareTargetReject
  ) {
    do {
      let store = OneShareTargetDraftStore(appGroupIdentifier: appGroup)
      let drafts = try store.loadPendingDrafts()
      resolve(drafts.map { serializeDraft($0, store: store) })
    } catch {
      reject("E_SHARE_TARGET_READ", error.localizedDescription, error)
    }
  }

  @objc(consumeDraft:sessionId:removeAttachments:resolve:reject:)
  public func consumeDraft(
    _ appGroup: String,
    sessionId: String,
    removeAttachments: Bool,
    resolve: @escaping OneShareTargetResolve,
    reject: @escaping OneShareTargetReject
  ) {
    do {
      let store = OneShareTargetDraftStore(appGroupIdentifier: appGroup)
      try store.markConsumed(sessionID: sessionId, removeAttachments: removeAttachments)
      resolve(nil)
    } catch {
      reject("E_SHARE_TARGET_CONSUME", error.localizedDescription, error)
    }
  }

  @objc(discardDraft:sessionId:resolve:reject:)
  public func discardDraft(
    _ appGroup: String,
    sessionId: String,
    resolve: @escaping OneShareTargetResolve,
    reject: @escaping OneShareTargetReject
  ) {
    do {
      let store = OneShareTargetDraftStore(appGroupIdentifier: appGroup)
      try store.discardDraft(sessionID: sessionId)
      resolve(nil)
    } catch {
      reject("E_SHARE_TARGET_DISCARD", error.localizedDescription, error)
    }
  }
}
