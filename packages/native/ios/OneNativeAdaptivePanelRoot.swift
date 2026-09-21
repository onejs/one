import SwiftUI
import UIKit

struct OneNativeAdaptivePanelRoot: View {
  @ObservedObject var model: OneNativeAdaptivePanelModel
  @Environment(\.horizontalSizeClass) private var sizeClass
  private var placement: String {
    guard model.controlled.value, model.content != nil else { return "hidden" }
    return sizeClass == .regular ? "regular" : "compact"
  }
  // adaptation flips placement, not open: the sheet binding only closes when its
  // own presentation dismisses while compact is the active placement. regular is
  // inline, not a presentation, so it has no dismiss binding.
  private var sheetPresented: Binding<Bool> {
    Binding(
      get: { model.controlled.value && model.content != nil && placement == "compact" },
      set: { value in if !value && placement == "compact" { model.change(false) } }
    )
  }
  @ViewBuilder private var content: some View {
    if let content = model.content {
      OneNativeSlot(content: content, mode: .presented, onLayout: { frame in
        if model.active && model.controlled.value { model.onLayout?(frame) }
      })
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .onGeometryChange(for: CGRect.self) { proxy in
        proxy.frame(in: .global)
      } action: { frame in
        if model.active && model.controlled.value {
          let placement: String = sizeClass == .regular ? "regular" : "compact"
          model.reportLayout(placement, frame)
        }
      }
    }
  }
  @ViewBuilder private var sidebar: some View {
    // absent width omits the modifier so the system picks the sidebar width.
    if let width = model.regularWidth {
      content.navigationSplitViewColumnWidth(CGFloat(width))
    } else {
      content
    }
  }
  var body: some View {
    // one content view, two native forms: a nonmodal sheet in compact and a
    // leading navigation split sidebar in regular (maps-style floating panel on
    // ipad). only one is active at a time, so adaptation moves the same react
    // native view, preserving react state.
    if placement == "regular" {
      NavigationSplitView {
        sidebar
      } detail: {
        Color.clear.allowsHitTesting(false)
      }
      .navigationSplitViewStyle(.automatic)
      .background(Color.clear)
      .onChange(of: model.controlled.value) { _, open in
        if model.active && !open { model.reportLayout("hidden", .zero) }
      }
      .task(id: placement) {
        if model.active && placement == "hidden" { model.reportLayout("hidden", .zero) }
      }
    } else {
      Color.clear
        .sheet(isPresented: sheetPresented) {
          content
            .presentationDetents(model.detents, selection: Binding(
              get: { model.selectedPresentationDetent },
              set: { model.changeDetent($0) }
            ))
            .presentationBackgroundInteraction(.enabled)
        }
        .onChange(of: model.controlled.value) { _, open in
          if model.active && !open { model.reportLayout("hidden", .zero) }
        }
        .task(id: placement) {
          if model.active && placement == "hidden" { model.reportLayout("hidden", .zero) }
        }
    }
  }
}
