import Foundation

// the swift entry point generated native-source glue posts events through.
// the bridge itself is objective-c so the classic module registry sees it.
@MainActor public enum OneNativeSourceEmitter {
  @MainActor public static func send(_ channel: String, _ argsJson: String) {
    OneNativeSourceSendEvent(channel, argsJson)
  }
}
