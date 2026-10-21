import AppKit
import SwiftUI

private struct OneRootView: NSViewRepresentable {
  func makeNSView(context: Context) -> OneMacosRootView {
    OneMacosRootView(bundleURL: OneMacosRootView.defaultBundleURL(), moduleName: "main")
  }

  func updateNSView(_ nsView: OneMacosRootView, context: Context) {}
}

@main
struct OneApp: App {
  var body: some Scene {
    WindowGroup {
      OneRootView()
        .frame(minWidth: 480, minHeight: 320)
    }
  }
}
